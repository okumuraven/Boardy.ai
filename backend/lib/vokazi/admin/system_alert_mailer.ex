defmodule Vokazi.Admin.SystemAlertMailer do
  @moduledoc "Sends internal system alerts to the admin team (e.g. when AI extraction fails)."

  alias Vokazi.Mailer
  alias Vokazi.Mailer.Template

  def notify_extraction_failure(call_id, reason) do
    admin_emails = [
      System.get_env("RESEND_FROM_EMAIL") || "hello@kuzanaconnect.tech",
      "okumuraven@gmail.com"
    ]
    
    html =
      Template.render(%{
        headline: "System Alert: Extraction Failed",
        body_html: """
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          The Gemini AI extraction failed for a recent voice interview (Call ID: <strong>#{call_id}</strong>). 
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          The raw transcript has been saved to the user's profile safely, but it requires manual review and summarization.
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
