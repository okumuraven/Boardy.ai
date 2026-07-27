defmodule Vokazi.Admin.AdminInvite do
  @moduledoc """
  A pending grant of admin access to an email address that hasn't signed
  in yet - Kuzana staff aren't community members and shouldn't have to
  go through voice-interview onboarding to get admin access. Consumed
  (deleted) only through the dedicated accept-invite link
  (`VokaziWeb.Admin.InviteAcceptController`) - not as a side effect of
  any regular sign-in, so the token/expiry/exact-account checks below
  actually mean something. See "Admin panel.md" §3, §6.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @admin_roles ["superadmin", "moderator", "support"]

  schema "admin_invites" do
    field :email, :string
    field :admin_role, :string
    field :token, :string
    field :expires_at, :utc_datetime

    belongs_to :invited_by, Vokazi.Accounts.User, foreign_key: :invited_by_user_id

    timestamps(updated_at: false)
  end

  @doc false
  def changeset(invite, attrs) do
    invite
    |> cast(attrs, [:email, :admin_role, :invited_by_user_id, :token, :expires_at])
    |> validate_required([:email, :admin_role, :invited_by_user_id, :token, :expires_at])
    |> validate_inclusion(:admin_role, @admin_roles)
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+\.[^\s]+$/, message: "must be a valid email address")
    |> unique_constraint(:email)
    |> unique_constraint(:token)
  end

  @doc "True once `expires_at` has passed."
  def expired?(%__MODULE__{expires_at: expires_at}) do
    DateTime.compare(expires_at, DateTime.utc_now()) != :gt
  end
end
