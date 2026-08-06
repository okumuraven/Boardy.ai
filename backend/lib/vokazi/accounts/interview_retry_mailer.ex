defmodule Vokazi.Accounts.InterviewRetryMailer do
  @moduledoc """
  One-off send for members whose voice interview was cut short by the
  now-fixed idle-timeout gap (empty Idle Messages list on the Vapi
  assistant meant a normal thinking pause could silently end the call).
  Not a recurring worker like `InterviewReminderMailer` - triggered
  manually by staff once for the specific members affected by that bug.
  """

  alias Vokazi.Mailer
  alias Vokazi.Mailer.Template

  def send_retry_invite(email, name) do
    html =
      Template.render(%{
        headline: "Let's finish your interview, #{Template.first_name(name)}",
        body_html: """
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          We noticed your voice interview didn't come through the way it
          should have last time - that was on us, not you. We tracked
          down a bug in how our assistant handled quiet pauses and it's
          fixed now.
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0;">
          Would you mind giving it another try? It only takes a few
          minutes, and it's the one thing standing between you and your
          first introduction on Kuzana Connect.
        </p>
        """,
        cta_text: "Redo my interview",
        cta_url: Template.frontend_url()
      })

    Mailer.deliver(email, "Sorry about that - your Kuzana Connect interview is ready to retry", html)
  end
end
