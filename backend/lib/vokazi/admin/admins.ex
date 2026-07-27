defmodule Vokazi.Admin.Admins do
  @moduledoc """
  Superadmin-only admin-account management (§6) - inviting new staff by
  email before they've ever signed in, changing an existing admin's
  tier, and suspending/reactivating access. Every mutation is
  audit-logged atomically via Ecto.Multi, matching the rest of
  `Vokazi.Admin.*`. Tier/superadmin-only enforcement itself happens in
  the controller (see "Admin panel.md" §4) - this module trusts the
  caller already checked that.
  """

  import Ecto.Query, warn: false

  alias Vokazi.{Accounts, Repo}
  alias Vokazi.Accounts.User
  alias Vokazi.Admin.{AdminInvite, AuditLog, InviteMailer}

  # How long an invite link stays valid before the invitee has to be re-invited.
  @invite_valid_hours 48

  @doc "Every user with a non-nil admin_role, plus any pending (not-yet-signed-in) invites."
  def list_admins do
    admins =
      from(u in User, where: not is_nil(u.admin_role), order_by: [asc: u.admin_role, asc: u.full_name])
      |> Repo.all()
      |> Enum.map(&admin_summary/1)

    pending_invites =
      from(i in AdminInvite, order_by: [desc: i.inserted_at])
      |> Repo.all()
      |> Enum.map(&invite_summary/1)

    %{admins: admins, pending_invites: pending_invites}
  end

  defp admin_summary(u) do
    %{
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      admin_role: u.admin_role,
      admin_status: u.admin_status,
      inserted_at: u.inserted_at
    }
  end

  defp invite_summary(i) do
    %{
      id: i.id,
      email: i.email,
      admin_role: i.admin_role,
      inserted_at: i.inserted_at,
      expires_at: i.expires_at,
      expired: AdminInvite.expired?(i),
      link: invite_link(i.token)
    }
  end

  @doc """
  Creates a pending invite for `email` and emails them the accept link
  (§6) - the invite is only ever consumed through
  `accept_invite/4`'s exact-account, not-expired check, never as a side
  effect of a regular sign-in. Replaces any existing pending invite for
  the same email (the Superadmin changed their mind about the tier, or
  is resending a fresh link) rather than erroring on the unique
  constraint. Returns the link and email delivery status even when the
  email send fails, so the Superadmin can copy/share it manually.
  """
  def invite(admin_id, email, role) do
    if existing_admin?(email) do
      {:error, :already_an_admin}
    else
      token = generate_token()
      expires_at = DateTime.utc_now() |> DateTime.add(@invite_valid_hours * 3600, :second) |> DateTime.truncate(:second)

      Ecto.Multi.new()
      |> Ecto.Multi.delete_all(:clear_existing, from(i in AdminInvite, where: i.email == ^email))
      |> Ecto.Multi.insert(:invite, AdminInvite.changeset(%AdminInvite{}, %{
        email: email,
        admin_role: role,
        invited_by_user_id: admin_id,
        token: token,
        expires_at: expires_at
      }))
      |> Ecto.Multi.insert(:audit_log, fn %{invite: invite} ->
        AuditLog.changeset(%AuditLog{}, %{
          admin_user_id: admin_id,
          action: "admin.invite",
          target_type: "admin_invite",
          target_id: invite.id,
          metadata: %{"email" => email, "admin_role" => role}
        })
      end)
      |> Repo.transaction()
      |> case do
        {:ok, %{invite: invite}} ->
          link = invite_link(token)
          email_status = case InviteMailer.send_invite(email, role, link, expires_at) do
            :ok -> :sent
            {:error, _} -> :failed
          end

          {:ok, invite, link, email_status}

        {:error, _step, changeset, _changes} ->
          {:error, changeset}
      end
    end
  end

  @doc "Public preview for the accept-invite screen - no auth, so only email/role/expiry, never anything else."
  def get_invite_preview(token) do
    case Repo.get_by(AdminInvite, token: token) do
      nil ->
        {:error, :not_found}

      invite ->
        if AdminInvite.expired?(invite) do
          {:error, :expired}
        else
          {:ok, %{email: invite.email, admin_role: invite.admin_role, expires_at: invite.expires_at}}
        end
    end
  end

  @doc """
  The only path that can ever consume an invite - checked here, not at
  regular sign-in, so the expiry and exact-account match actually mean
  something. `sub`/`email`/`name` come from a freshly-verified Google ID
  token (see `VokaziWeb.Admin.InviteAcceptController`).
  """
  def accept_invite(token, sub, email, name) do
    case Repo.get_by(AdminInvite, token: token) do
      nil ->
        {:error, :not_found}

      invite ->
        cond do
          AdminInvite.expired?(invite) -> {:error, :expired}
          not emails_match?(invite.email, email) -> {:error, {:email_mismatch, invite.email}}
          true -> do_accept(invite, sub, email, name)
        end
    end
  end

  defp emails_match?(a, b), do: String.downcase(a) == String.downcase(b)

  defp do_accept(invite, sub, email, name) do
    Repo.transaction(fn ->
      with {:ok, user} <- Accounts.find_or_create_by_google(sub, email, name),
           {:ok, updated} <-
             user
             |> User.admin_changeset(%{admin_role: invite.admin_role, admin_status: "active"})
             |> Repo.update(),
           {:ok, _log} <-
             AuditLog.changeset(%AuditLog{}, %{
               admin_user_id: updated.id,
               action: "admin.accept_invite",
               target_type: "admin_invite",
               target_id: invite.id,
               metadata: %{"email" => email, "admin_role" => invite.admin_role}
             })
             |> Repo.insert(),
           {:ok, _} <- Repo.delete(invite) do
        updated
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp generate_token, do: :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)

  defp invite_link(token), do: frontend_url() <> "/admin?invite=" <> token

  defp frontend_url, do: System.get_env("FRONTEND_URL") || "http://localhost:5173"

  defp existing_admin?(email) do
    case Repo.get_by(User, email: email) do
      %User{admin_role: role} -> not is_nil(role)
      nil -> false
    end
  end

  @doc """
  Cancels a pending invite before it's ever consumed - e.g. the invited
  email turned out to already be a regular community member and
  shouldn't auto-provision into staff access at their next sign-in.
  """
  def revoke_invite(admin_id, invite_id) do
    case Repo.get(AdminInvite, invite_id) do
      nil ->
        {:error, :not_found}

      invite ->
        Ecto.Multi.new()
        |> Ecto.Multi.delete(:invite, invite)
        |> Ecto.Multi.insert(:audit_log, fn _changes ->
          AuditLog.changeset(%AuditLog{}, %{
            admin_user_id: admin_id,
            action: "admin.revoke_invite",
            target_type: "admin_invite",
            target_id: invite.id,
            metadata: %{"email" => invite.email, "admin_role" => invite.admin_role}
          })
        end)
        |> Repo.transaction()
        |> case do
          {:ok, _changes} -> {:ok, invite}
          {:error, _step, changeset, _changes} -> {:error, changeset}
        end
    end
  end

  @doc "Promotes/demotes an existing admin's tier. Cannot target the acting admin's own account."
  def set_role(admin_id, target_id, new_role) do
    if same_id?(admin_id, target_id) do
      {:error, :cannot_act_on_self}
    else
      with %User{admin_role: role} = target <- Repo.get(User, target_id),
           true <- not is_nil(role) do
        mutate(admin_id, target, %{admin_role: new_role}, "admin.set_role", %{"from" => role, "to" => new_role})
      else
        nil -> {:error, :not_found}
        false -> {:error, :not_an_admin}
      end
    end
  end

  @doc "Locks an admin out on their very next request. Cannot target the acting admin's own account."
  def suspend(admin_id, target_id) do
    if same_id?(admin_id, target_id) do
      {:error, :cannot_act_on_self}
    else
      with %User{admin_role: role} = target <- Repo.get(User, target_id),
           true <- not is_nil(role) do
        mutate(admin_id, target, %{admin_status: "suspended"}, "admin.suspend", %{})
      else
        nil -> {:error, :not_found}
        false -> {:error, :not_an_admin}
      end
    end
  end

  @doc "Restores a suspended admin - their tier was never cleared, so no need to re-pick it."
  def reactivate(admin_id, target_id) do
    with %User{admin_role: role} = target <- Repo.get(User, target_id),
         true <- not is_nil(role) do
      mutate(admin_id, target, %{admin_status: "active"}, "admin.reactivate", %{})
    else
      nil -> {:error, :not_found}
      false -> {:error, :not_an_admin}
    end
  end

  # `target_id` arrives as a string from the router's path param while
  # `admin_id` is the already-loaded integer primary key - a bare `==`
  # guard silently never matches across that type difference, which is
  # exactly how the self-suspend guard failed to fire the first time
  # this was tested against a real account.
  defp same_id?(admin_id, target_id), do: to_string(admin_id) == to_string(target_id)

  defp mutate(admin_id, target, attrs, action, extra_metadata) do
    Ecto.Multi.new()
    |> Ecto.Multi.update(:target, User.admin_changeset(target, attrs))
    |> Ecto.Multi.insert(:audit_log, fn %{target: updated} ->
      AuditLog.changeset(%AuditLog{}, %{
        admin_user_id: admin_id,
        action: action,
        target_type: "user",
        target_id: updated.id,
        metadata: extra_metadata
      })
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{target: updated}} -> {:ok, updated}
      {:error, _step, changeset, _changes} -> {:error, changeset}
    end
  end

  @per_page 25

  @doc "`opts` (all optional): :action, :target_type, :page."
  def list_audit_logs(opts \\ %{}) do
    page = max(Map.get(opts, :page, 1), 1)
    action = blank_to_nil(Map.get(opts, :action))
    target_type = blank_to_nil(Map.get(opts, :target_type))

    base_query =
      from(l in AuditLog)
      |> maybe_filter(:action, action)
      |> maybe_filter(:target_type, target_type)

    total_count = base_query |> select([l], count(l.id)) |> Repo.one()

    rows =
      base_query
      |> order_by([l], desc: l.inserted_at)
      |> limit(^@per_page)
      |> offset(^((page - 1) * @per_page))
      |> Repo.all()

    %{
      logs: Enum.map(rows, &to_log_summary/1),
      page: page,
      per_page: @per_page,
      total_count: total_count,
      total_pages: max(ceil(total_count / @per_page), 1)
    }
  end

  defp to_log_summary(log) do
    admin = log.admin_user_id && Repo.get(User, log.admin_user_id)

    %{
      id: log.id,
      admin: %{id: log.admin_user_id, name: admin && admin.full_name},
      action: log.action,
      target_type: log.target_type,
      target_id: log.target_id,
      reason: log.reason,
      metadata: log.metadata,
      inserted_at: log.inserted_at
    }
  end

  defp blank_to_nil(nil), do: nil
  defp blank_to_nil(""), do: nil
  defp blank_to_nil(value), do: value

  defp maybe_filter(query, _field, nil), do: query
  defp maybe_filter(query, :action, value), do: where(query, [l], l.action == ^value)
  defp maybe_filter(query, :target_type, value), do: where(query, [l], l.target_type == ^value)
end
