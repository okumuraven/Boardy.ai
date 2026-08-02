defmodule Vokazi.Admin.BiziApplications do
  @moduledoc """
  Support+ read - browse and review Bizi program applications, newest
  first. Read-only, intentionally: everything past `submitted` (the real
  screening call, DD visit, board approval, all legal/equity paperwork)
  stays exactly where it already lives - Felicity's calls, Kuzana's
  contracts via eSignatures (bizi_flow.md §7). This module's only job is
  visibility - closing the loop on the notification `Vokazi.Bizi`
  already sends to every active Superadmin, which previously had nowhere
  to lead.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Bizi.Application

  @per_page 25

  @doc "`opts` (all optional): :page."
  def list_applications(opts \\ %{}) do
    page = max(Map.get(opts, :page, 1), 1)

    base_query = from(a in Application)
    total_count = base_query |> select([a], count(a.id)) |> Repo.one()

    rows =
      base_query
      |> order_by([a], desc: a.inserted_at)
      |> limit(^@per_page)
      |> offset(^((page - 1) * @per_page))
      |> Repo.all()

    %{
      applications: Enum.map(rows, &to_summary/1),
      page: page,
      per_page: @per_page,
      total_count: total_count,
      total_pages: max(ceil(total_count / @per_page), 1)
    }
  end

  def get_application(id) do
    case Repo.get(Application, id) do
      nil -> {:error, :not_found}
      application -> {:ok, to_detail(application)}
    end
  end

  defp to_summary(application) do
    %{
      id: application.id,
      applicant: applicant_summary(application.user_id),
      company_name: application.company_name,
      track: application.track,
      batch_target: application.batch_target,
      status: application.status,
      inserted_at: application.inserted_at
    }
  end

  defp to_detail(application) do
    %{
      id: application.id,
      applicant: applicant_summary(application.user_id),
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

  defp applicant_summary(user_id) do
    case Repo.get(User, user_id) do
      nil -> %{id: user_id, name: nil, email: nil}
      user -> %{id: user.id, name: user.full_name, email: user.email}
    end
  end
end
