defmodule Vokazi.Repo.Migrations.AddInterviewChannelToProfiles do
  use Ecto.Migration

  # Which onboarding path actually produced this profile's offer/need -
  # "voice" (Vapi) or "chat" (the text-interview alternative). Nil for
  # every profile that existed before this column did; no backfill since
  # there's no reliable way to know which channel those used in
  # retrospect. Exists purely for the admin dashboard to report
  # voice-vs-chat completion, the metric that motivated building chat in
  # the first place.
  def change do
    alter table(:profiles) do
      add :interview_channel, :string
    end
  end
end
