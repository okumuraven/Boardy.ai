defmodule VokaziWeb.InvestmentController do
  use VokaziWeb, :controller

  alias Vokazi.Investment

  @doc "This user's own funding/investment details."
  def show(conn, %{"user_id" => user_id}) do
    json(conn, to_json(Investment.get_for_user(to_int(user_id))))
  end

  @doc "Upserts funding/investment details - founder-side or investor-side fields, whichever apply."
  def upsert(conn, %{"user_id" => user_id} = params) do
    attrs =
      Map.take(params, [
        "business_stage",
        "funding_amount_sought",
        "funding_types",
        "key_financials",
        "check_size",
        "sectors_of_interest"
      ])

    case Investment.upsert(to_int(user_id), attrs) do
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
      sectors_of_interest: profile.sectors_of_interest
    }
  end

  defp to_int(id) when is_integer(id), do: id
  defp to_int(id) when is_binary(id), do: String.to_integer(id)
end
