defmodule VokaziWeb.Admin.MatchController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.Matches

  @doc "Support+ - filterable/paginated match list with engagement/dormancy flags (§7.2)."
  def index(conn, params) do
    data =
      Matches.list_matches(%{
        status: params["status"],
        outcome_status: params["outcome_status"],
        created_by_admin: parse_bool(params["created_by_admin"]),
        page: parse_page(params["page"])
      })

    json(conn, %{
      matches: data.matches,
      page: data.page,
      per_page: data.per_page,
      total_count: data.total_count,
      total_pages: data.total_pages
    })
  end

  @doc "Support+ - a single match's detail plus engagement/dormancy."
  def show(conn, %{"id" => id}) do
    case Matches.get_match(id) do
      nil ->
        conn |> put_status(404) |> json(%{error: "Not found"})

      %{match: match, user_a: user_a, user_b: user_b, engagement: engagement} ->
        json(conn, %{
          id: match.id,
          status: match.status,
          ai_score: match.ai_score,
          decline_reason: match.decline_reason,
          creation_note: match.creation_note,
          created_by_admin_id: match.created_by_admin_id,
          outcome_status: match.outcome_status,
          outcome_notes: match.outcome_notes,
          outcome_recorded_by_id: match.outcome_recorded_by_id,
          outcome_recorded_at: match.outcome_recorded_at,
          user_a: %{id: user_a && user_a.id, name: user_a && user_a.full_name},
          user_b: %{id: user_b && user_b.id, name: user_b && user_b.full_name},
          engagement: engagement,
          inserted_at: match.inserted_at,
          updated_at: match.updated_at
        })
    end
  end

  @doc "Moderator+ - digitizes Kyle's Strategy Board pairing. Skips the AI floor, keeps mutual consent."
  def create(conn, %{"user_a_id" => user_a_id, "user_b_id" => user_b_id} = params) do
    if moderator_or_above?(conn) do
      admin = conn.assigns.current_admin

      case Matches.create_manual_match(admin.id, user_a_id, user_b_id, params["creation_note"]) do
        {:ok, match} ->
          json(conn, %{id: match.id, status: match.status})

        {:error, :cannot_match_self} ->
          conn |> put_status(422) |> json(%{error: "Cannot match a user with themselves"})

        {:error, {:already_matched, existing}} ->
          conn |> put_status(422) |> json(%{error: "These users already have a match", match_id: existing.id})

        {:error, changeset} ->
          conn |> put_status(422) |> json(%{error: "Invalid data", details: format_errors(changeset)})
      end
    else
      forbidden(conn)
    end
  end

  @doc "Moderator+ - the bounty-evidence trail: was this introduction actually valuable? Audit-logged."
  def record_outcome(conn, %{"id" => id} = params) do
    if moderator_or_above?(conn) do
      admin = conn.assigns.current_admin

      case Matches.record_outcome(id, admin.id, params["outcome_status"], params["outcome_notes"]) do
        {:ok, match} ->
          json(conn, %{id: match.id, outcome_status: match.outcome_status})

        {:error, changeset} ->
          conn |> put_status(422) |> json(%{error: "Invalid data", details: format_errors(changeset)})
      end
    else
      forbidden(conn)
    end
  end

  @doc "Support+ - aggregate decline_reason counts (§7.4)."
  def decline_reasons(conn, _params) do
    json(conn, %{reasons: Matches.decline_reasons()})
  end

  defp moderator_or_above?(conn), do: conn.assigns.current_admin.admin_role in ["moderator", "superadmin"]

  defp forbidden(conn), do: conn |> put_status(403) |> json(%{error: "Forbidden - requires moderator or higher"})

  defp parse_page(nil), do: 1

  defp parse_page(page) do
    case Integer.parse(to_string(page)) do
      {int, _} -> int
      :error -> 1
    end
  end

  defp parse_bool(nil), do: nil
  defp parse_bool("true"), do: true
  defp parse_bool("false"), do: false
  defp parse_bool(_), do: nil

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
