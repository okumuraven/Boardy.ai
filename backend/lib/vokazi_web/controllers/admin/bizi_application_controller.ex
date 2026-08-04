defmodule VokaziWeb.Admin.BiziApplicationController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.BiziApplications

  @doc "Support+ - every Bizi application, newest first."
  def index(conn, params) do
    data = BiziApplications.list_applications(%{page: parse_page(params["page"])})

    json(conn, %{
      applications: data.applications,
      page: data.page,
      per_page: data.per_page,
      total_count: data.total_count,
      total_pages: data.total_pages
    })
  end

  @doc "Support+ - full detail, including the stage timeline and reference list."
  def show(conn, %{"id" => id}) do
    case BiziApplications.get_application(id) do
      {:ok, application} -> json(conn, application)
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "Not found"})
    end
  end

  @doc "Moderator+ - advances an application to a new stage with a required comment."
  def advance_stage(conn, %{"id" => id, "status" => status} = params) do
    if moderator_or_above?(conn) do
      case BiziApplications.advance_stage(current_admin(conn).id, id, status, params["comment"], params) do
        {:ok, application} -> json(conn, %{id: application.id, status: application.status})
        {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "Not found"})
        {:error, changeset} -> conn |> put_status(422) |> json(%{error: VokaziWeb.ChangesetErrors.format(changeset)})
      end
    else
      forbidden(conn)
    end
  end

  @doc "Moderator+ - sets (or clears) the named owner for this application."
  def assign(conn, %{"id" => id} = params) do
    if moderator_or_above?(conn) do
      case BiziApplications.assign(current_admin(conn).id, id, params["assigned_to_admin_id"]) do
        {:ok, application} -> json(conn, %{id: application.id, assigned_to_admin_id: application.assigned_to_admin_id})
        {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "Not found"})
        {:error, changeset} -> conn |> put_status(422) |> json(%{error: VokaziWeb.ChangesetErrors.format(changeset)})
      end
    else
      forbidden(conn)
    end
  end

  @doc "Moderator+ - adds a reference (customer or creditor) to the checklist."
  def create_reference(conn, %{"id" => id} = params) do
    if moderator_or_above?(conn) do
      case BiziApplications.add_reference(current_admin(conn).id, id, params) do
        {:ok, reference} -> conn |> put_status(:created) |> json(%{id: reference.id})
        {:error, changeset} -> conn |> put_status(422) |> json(%{error: VokaziWeb.ChangesetErrors.format(changeset)})
      end
    else
      forbidden(conn)
    end
  end

  @doc "Moderator+ - marks a reference contacted/verified, or edits its notes."
  def update_reference(conn, %{"reference_id" => reference_id} = params) do
    if moderator_or_above?(conn) do
      case BiziApplications.update_reference(current_admin(conn).id, reference_id, params) do
        {:ok, reference} -> json(conn, %{id: reference.id, contacted: reference.contacted, verified: reference.verified})
        {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "Not found"})
        {:error, changeset} -> conn |> put_status(422) |> json(%{error: VokaziWeb.ChangesetErrors.format(changeset)})
      end
    else
      forbidden(conn)
    end
  end

  @doc "Moderator+ - tags an attachment already sitting in the verification chat as a real Kuzana document type."
  def tag_document(conn, %{"id" => id, "message_attachment_id" => attachment_id, "document_type" => document_type}) do
    if moderator_or_above?(conn) do
      case BiziApplications.tag_document(current_admin(conn).id, id, attachment_id, document_type) do
        {:ok, document} -> conn |> put_status(:created) |> json(%{id: document.id, document_type: document.document_type})
        {:error, changeset} -> conn |> put_status(422) |> json(%{error: VokaziWeb.ChangesetErrors.format(changeset)})
      end
    else
      forbidden(conn)
    end
  end

  @doc """
  Superadmin only - the final board decision. Approval atomically flags
  the applicant's own Connect profile `is_bizi: true`.
  """
  def decide(conn, %{"id" => id, "decision" => decision} = params) do
    if superadmin?(conn) do
      case BiziApplications.record_decision(current_admin(conn).id, id, decision, params["reason"]) do
        {:ok, application} -> json(conn, %{id: application.id, status: application.status})
        {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "Not found"})
        {:error, :invalid_decision} -> conn |> put_status(422) |> json(%{error: "decision must be 'approved' or 'declined'"})
        {:error, changeset} -> conn |> put_status(422) |> json(%{error: VokaziWeb.ChangesetErrors.format(changeset)})
      end
    else
      forbidden(conn, "requires superadmin")
    end
  end

  defp moderator_or_above?(conn), do: current_admin(conn).admin_role in ["moderator", "superadmin"]
  defp superadmin?(conn), do: current_admin(conn).admin_role == "superadmin"
  defp current_admin(conn), do: conn.assigns.current_admin

  defp forbidden(conn, reason \\ "requires moderator or higher"),
    do: conn |> put_status(403) |> json(%{error: "Forbidden - #{reason}"})

  defp parse_page(nil), do: 1

  defp parse_page(page) do
    case Integer.parse(to_string(page)) do
      {int, _} -> int
      :error -> 1
    end
  end
end
