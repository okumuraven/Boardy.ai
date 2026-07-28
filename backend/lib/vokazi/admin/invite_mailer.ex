defmodule Vokazi.Admin.InviteMailer do
  @moduledoc """
  Sends the admin-invite email via `Vokazi.Mailer` (Resend), rendered
  through the shared `Vokazi.Mailer.Template` brand shell. See
  "Admin panel.md" §6.

  Without a verified sending domain on Resend, sandbox mode can only
  deliver to the email address the Resend account itself was created
  with - a real invite to any other address will fail until
  `RESEND_FROM_EMAIL` is on a verified domain (kuzana.co, post-hackathon).
  """

  alias Vokazi.Mailer
  alias Vokazi.Mailer.Template

  @role_labels %{"support" => "Support", "moderator" => "Moderator", "superadmin" => "Superadmin"}

  @doc "Returns :ok once Resend accepts the send, {:error, reason} otherwise - the invite row is created either way."
  def send_invite(email, role, link, expires_at) do
    expires_str = Calendar.strftime(expires_at, "%B %d, %Y at %H:%M UTC")
    role_label = Map.get(@role_labels, role, role)

    html =
      Template.render(%{
        headline: "You're in.",
        body_html: """
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 20px;">
          You've been added to Kuzana Connect staff as <strong style="color:#4a6290;">#{role_label}</strong>.
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #5a6172; margin: 0; line-height: 1.5;">
          Expires #{expires_str}. Only works with the Google account this was sent to.
        </p>
        """,
        cta_text: "Accept invite",
        cta_url: link
      })

    Mailer.deliver(email, "You're in - Kuzana Connect staff", html)
  end
end
