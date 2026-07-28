defmodule Vokazi.Admin.FeatureAnnouncementWorker do
  @moduledoc """
  Delivers one feature-announcement email to one member - one job per
  recipient, bulk-inserted by `Vokazi.Admin.FeatureAnnouncements.create_and_broadcast/3`
  rather than looping a blocking send over every member inline.
  """
  use Oban.Worker, queue: :mailers, max_attempts: 3

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Admin.{FeatureAnnouncement, FeatureAnnouncementMailer}

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"user_id" => user_id, "announcement_id" => announcement_id}}) do
    with %{email: email} = user when is_binary(email) <- Repo.get(User, user_id),
         %FeatureAnnouncement{} = announcement <- Repo.get(FeatureAnnouncement, announcement_id) do
      FeatureAnnouncementMailer.send_announcement(email, user.full_name, announcement.title, announcement.message)
    else
      _ -> :ok
    end
  end
end
