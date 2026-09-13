defmodule Vokazi.Accounts.InterviewReminderMailer do
  @moduledoc """
  One-shot nudge for a member who signed up but never finished the
  voice interview - fired at most once per account by
  `Vokazi.Accounts.InterviewReminderWorker`. Deliberately a single
  reminder, not a recurring drip: a repeated nag risks getting marked
  as spam, which would hurt Resend's sender reputation for every other
  email this app sends. A member still stuck after this is better
  surfaced to staff (already visible in the admin onboarding funnel)
  for a human follow-up than further automation.
  """

  alias Vokazi.Mailer
  alias Vokazi.Mailer.Template

  def send_reminder(email, name) do
    html =
      Template.render(%{
        headline: "Still there, #{Template.first_name(name)}?",
        body_html: """
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          You signed up for Kuzana Connect but haven't done your interview
          yet - it's the one thing standing between you and your first
          introduction. Takes a few minutes.
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          If a voice call isn't your thing, you can now do a quick text
          chat instead - same result, your choice.
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #5a6172; margin: 0;">
          Once you're in, tap the "?" in the corner of the app for a quick
          tour of what everything does.
        </p>
        """,
        cta_text: "Finish your interview",
        cta_url: Template.frontend_url()
      })

    Mailer.deliver(email, "Finish setting up your Kuzana Connect profile", html)
  end
end
