defmodule VokaziWeb.InvestmentController do
  use VokaziWeb, :controller

  alias Vokazi.Investment

  @doc "This user's own funding/investment details."
  def show(conn, _params) do
    json(conn, to_json(Investment.get_for_user(conn.assigns.current_user_id)))
  end

  @doc "Upserts funding/investment details - founder-side or investor-side fields, whichever apply."
  def upsert(conn, params) do
    attrs =
      Map.take(params, [
        "business_stage",
        "funding_amount_sought",
        "funding_types",
        "key_financials",
        "check_size",
        "sectors_of_interest",
        "traction",
        "team_composition"
      ])

    case Investment.upsert(conn.assigns.current_user_id, attrs) do
      {:ok, profile} ->
        json(conn, to_json(profile))

      {:error, changeset} ->
        error_msg =
          Enum.reduce(changeset.errors, "Validation failed", fn {field, {msg, _}}, _acc -> "#{field} #{msg}" end)

        conn |> put_status(:unprocessable_entity) |> json(%{error: error_msg})
    end
  end

  defp to_json(profile) do
    %{
      business_stage: profile.business_stage,
      funding_amount_sought: profile.funding_amount_sought,
      funding_types: profile.funding_types,
      key_financials: profile.key_financials,
      check_size: profile.check_size,
      sectors_of_interest: profile.sectors_of_interest,
      traction: profile.traction,
      team_composition: profile.team_composition
    }
  end
end
