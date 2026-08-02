defmodule VokaziWeb.BiziApplicationController do
  use VokaziWeb, :controller

  alias Vokazi.Bizi

  @doc "Every application this member has ever submitted, newest first - see bizi_flow.md §2."
  def index(conn, _params) do
    applications = Bizi.list_for_user(conn.assigns.current_user_id)
    json(conn, %{applications: Enum.map(applications, &serialize/1)})
  end

  @doc """
  Creates a Bizi application. The founders-only gate (bizi_flow.md §1) is
  enforced here too, not just hidden client-side - `role` lives on
  `Vokazi.Accounts.User`, loaded fresh, not trusted from the request.
  """
  def create(conn, params) do
    with :ok <- check_founder(conn.assigns.current_user_id),
         {:ok, application} <- Bizi.create_application(conn.assigns.current_user_id, params) do
      conn |> put_status(:created) |> json(%{application: serialize(application)})
    else
      {:error, :not_a_founder} ->
        conn |> put_status(:forbidden) |> json(%{error: "Bizi applications are for operating founders only."})

      {:error, changeset} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: VokaziWeb.ChangesetErrors.format(changeset)})
    end
  end

  defp check_founder(user_id) do
    case Vokazi.Repo.get(Vokazi.Accounts.User, user_id) do
      %{role: role} -> if Bizi.eligible_role?(role), do: :ok, else: {:error, :not_a_founder}
      nil -> {:error, :not_a_founder}
    end
  end

  defp serialize(application) do
    %{
      id: application.id,
      preferred_name: application.preferred_name,
      other_names: application.other_names,
      email: application.email,
      whatsapp: application.whatsapp,
      company_name: application.company_name,
      business_description: application.business_description,
      track: application.track,
      heard_about_us: application.heard_about_us,
      referred_by: application.referred_by,
      eligibility: application.eligibility,
      question_for_us: application.question_for_us,
      batch_target: application.batch_target,
      status: application.status,
      inserted_at: application.inserted_at
    }
  end
end
