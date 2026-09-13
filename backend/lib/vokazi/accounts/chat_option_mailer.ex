defmodule Vokazi.Accounts.ChatOptionMailer do
  @moduledoc """
  One-off announcement for members who were already sent the old
  voice-only `InterviewReminderMailer` (so `Vokazi.Accounts.
  InterviewReminderWorker` will never touch their account again by
  design - see that module's moduledoc) but still haven't finished
  their interview. Triggered manually via `send_chat_announcement.exs`,
  the same "run once, by a human" convention as `InterviewRetryMailer`
  - not a recurring worker, and not that module, since its copy/moduledoc
  are specifically about the unrelated, now-fixed Vapi idle-timeout bug.
  """

  alias Vokazi.Mailer
  alias Vokazi.Mailer.Template

  def send_announcement(email, name) do
    html =
      Template.render(%{
        headline: "A new way to finish your interview, #{Template.first_name(name)}",
        body_html: """
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          We heard that a voice call isn't for everyone - some people just
          prefer typing. So we built a chat option: same friendly
          interview, same result, just as a text conversation instead of
          a call.
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          It's the one thing standing between you and your first
          introduction on Kuzana Connect - takes a few minutes either way.
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #5a6172; margin: 0;">
          Once you're in, tap the "?" in the corner of the app for a quick
          tour of what everything does.
        </p>
        """,
        cta_text: "Try it now",
        cta_url: Template.frontend_url()
      })

    Mailer.deliver(email, "There's now a chat option for your Kuzana Connect interview", html)
  end
end
