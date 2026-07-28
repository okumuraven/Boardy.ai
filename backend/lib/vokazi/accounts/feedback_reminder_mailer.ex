defmodule Vokazi.Accounts.FeedbackReminderMailer do
  @moduledoc "One-shot nudge for a member who's never left feedback - see `Vokazi.Accounts.FeedbackReminderWorker`."

  alias Vokazi.Mailer
  alias Vokazi.Mailer.Template

  def send_reminder(email, name) do
    html =
      Template.render(%{
        headline: "Got a minute, #{Template.first_name(name)}?",
        body_html: """
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0;">
          You've been trying out Kuzana Connect - we'd love your honest
          take on it. Good, bad, confusing, whatever it is - it genuinely
          helps us make it better.
        </p>
        """,
        cta_text: "Share your feedback",
        cta_url: Template.frontend_url()
      })

    Mailer.deliver(email, "Quick favor - how's Kuzana Connect going?", html)
  end
end
