defmodule VokaziWeb.FeedbackController do
  use VokaziWeb, :controller

  alias Vokazi.Feedback

  @doc "Whether the floating feedback widget should show for the current member."
  def status(conn, _params) do
    json(conn, %{show: Feedback.should_show_widget?(conn.assigns.current_user_id)})
  end

  @doc "Submits a 1-5 rating plus an optional message."
  def create(conn, %{"rating" => rating} = params) do
    case Feedback.create_submission(conn.assigns.current_user_id, rating, params["message"]) do
      {:ok, submission} -> json(conn, %{id: submission.id})
      {:error, changeset} -> conn |> put_status(:unprocessable_entity) |> json(%{error: VokaziWeb.ChangesetErrors.format(changeset)})
    end
  end
end
