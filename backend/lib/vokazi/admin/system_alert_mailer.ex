defmodule Vokazi.Admin.SystemAlertMailer do
  @moduledoc "Sends internal system alerts to the admin team (e.g. when AI extraction fails)."

  alias Vokazi.Mailer
  alias Vokazi.Mailer.Template

  # `channel` is "voice" or "chat" - both InterviewChatController.finish/2
  # and VapiController's end-of-call handling hit the same
  # Vokazi.AI.extract_summary/1 failure fallback, so this alert should
  # never be voice-specific in its wording even though it started that
  # way when only the voice webhook called it.
  def notify_extraction_failure(channel, identifier, reason) do
    admin_emails = [
      System.get_env("RESEND_FROM_EMAIL") || "hello@kuzanaconnect.tech",
      "okumuraven@gmail.com"
    ]

    html =
      Template.render(%{
        headline: "System Alert: Extraction Failed",
        body_html: """
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          The Gemini AI extraction failed for a recent #{channel} interview (#{identifier}), even after an automatic retry.
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          The raw transcript has been saved safely and a daily job will keep retrying summarization automatically - no action needed unless it's still showing a raw transcript after a few days.
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0;">
          <strong>Error details:</strong><br>
          <code>#{inspect(reason)}</code>
        </p>
        """,
        cta_text: "Log in to check",
        cta_url: Template.frontend_url() <> "/admin"
      })

    Enum.each(admin_emails, fn email ->
      Mailer.deliver(email, "🚨 System Alert: Interview Extraction Failed", html)
    end)
  end
end
