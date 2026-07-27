defmodule Vokazi.Admin.InviteMailer do
  @moduledoc """
  Sends the admin-invite email via Resend's REST API - a single `Req`
  call, matching the same Req-based style already used elsewhere for
  external HTTP calls (`Vokazi.Auth.GoogleSignIn`,
  `Vokazi.SocialProfiles.GithubClient`) rather than pulling in Swoosh
  for one transactional email. See "Admin panel.md" §6.

  Styled to `Kuzana_Brand_Guidelines.pdf`: the three-arc mark (a
  rasterized copy of `frontend/src/components/KuzanaMark.jsx`'s SVG,
  hosted at a real public URL since neither inline `<svg>` nor a
  base64 `<img>` render in Gmail - confirmed against two real sends,
  the former is silently stripped and the latter shows a broken-image
  icon because Gmail's image proxy can't fetch a data URI), the Focus
  Blue/Coral/Gold palette at roughly the guide's own 60/30/7/3 ink
  ratio, Space Grotesk headings over Inter body text, and the direct/
  peer-to-peer voice ("say it straight, no fluff") - not corporate
  transactional-email boilerplate.

  Without a verified sending domain on Resend, sandbox mode can only
  deliver to the email address the Resend account itself was created
  with - a real invite to any other address will fail until
  `RESEND_FROM_EMAIL` is on a verified domain (kuzana.co, post-hackathon).
  """

  require Logger

  @resend_url "https://api.resend.com/emails"

  @role_labels %{"support" => "Support", "moderator" => "Moderator", "superadmin" => "Superadmin"}

  # Hosted publicly (Gmail's image proxy can't fetch a data URI, and
  # inline <svg> is stripped outright - both confirmed against real
  # sends) at the user's existing image-hosting repo.
  @mark_image_url "https://raw.githubusercontent.com/okumuraven/Image_host/main/kuzana_mark.png"

  @doc "Returns :ok once Resend accepts the send, {:error, reason} otherwise - the invite row is created either way."
  def send_invite(email, role, link, expires_at) do
    body = %{
      from: from_address(),
      to: [email],
      subject: "You're in - Kuzana Connect staff",
      html: render_html(role, link, expires_at)
    }

    case Req.post(@resend_url, json: body, auth: {:bearer, api_key()}, receive_timeout: 15_000) do
      {:ok, %Req.Response{status: status}} when status in 200..299 ->
        :ok

      {:ok, %Req.Response{status: status, body: resp_body}} ->
        Logger.error("Vokazi.Admin.InviteMailer: Resend rejected email status=#{status} body=#{inspect(resp_body)}")
        {:error, :send_failed}

      {:error, reason} ->
        Logger.error("Vokazi.Admin.InviteMailer: Resend request error: #{inspect(reason)}")
        {:error, :send_failed}
    end
  end

  defp render_html(role, link, expires_at) do
    expires_str = Calendar.strftime(expires_at, "%B %d, %Y at %H:%M UTC")
    role_label = Map.get(@role_labels, role, role)

    """
    <!doctype html>
    <html>
      <body style="margin:0; padding:0; background:#fafaf7;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf7;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; max-width:480px; width:100%;">
                <tr>
                  <td style="padding: 40px 40px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 10px; vertical-align: middle;">#{mark_image()}</td>
                        <td style="vertical-align: middle;">
                          <span style="font-family: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif; font-weight: 700; font-size: 20px; color: #1a1a1a; letter-spacing: -0.02em;">KUZANA</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 8px;">
                    <h1 style="font-family: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif; font-weight: 700; font-size: 25px; line-height: 1.25; color: #1a1a1a; margin: 0;">You're in.</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 28px;">
                    <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0;">
                      You've been added to Kuzana Connect staff as <strong style="color:#4a6290;">#{role_label}</strong>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 32px;">
                    <a href="#{link}" style="display:inline-block; background:#4a6290; color:#ffffff; font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 15px; text-decoration:none; padding: 13px 28px; border-radius: 6px;">Accept invite</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 32px; border-bottom: 1px solid #e8e4de;">
                    <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #5a6172; margin: 0 0 24px; line-height: 1.5;">
                      Expires #{expires_str}. Only works with the Google account this was sent to.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px 32px;">
                    #{tri_color_bar()}
                    <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #5a6172; margin: 16px 0 0; line-height: 1.6;">
                      kuzana.co &middot; Spring Valley, Nairobi, Kenya
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """
  end

  defp mark_image do
    ~s(<img src="#{@mark_image_url}" width="26" height="26" alt="Kuzana" style="display:block; border:0;">)
  end

  # Community (gold) / Professionalize (coral) / Focus (blue), equal
  # thirds - the same tri-color bar used for the brand's email
  # signature and footer treatments.
  defp tri_color_bar do
    """
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%" style="background:#fdc469; height:4px; font-size:0; line-height:0;">&nbsp;</td>
        <td width="33%" style="background:#fe7272; height:4px; font-size:0; line-height:0;">&nbsp;</td>
        <td width="34%" style="background:#4a6290; height:4px; font-size:0; line-height:0;">&nbsp;</td>
      </tr>
    </table>
    """
  end

  defp api_key, do: System.fetch_env!("RESEND_API_KEY")
  defp from_address, do: System.get_env("RESEND_FROM_EMAIL") || "onboarding@resend.dev"
end
