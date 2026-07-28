defmodule Vokazi.Mailer.Template do
  @moduledoc """
  The shared branded HTML shell every transactional email renders
  inside - extracted from the original admin-invite email (the first
  one built) so every later email type gets the same Kuzana brand
  treatment for free instead of re-implementing it per mailer.

  Styled to `Kuzana_Brand_Guidelines.pdf`: the three-arc mark (hosted
  publicly - neither inline `<svg>` nor a base64 `<img>` render in
  Gmail, confirmed against real sends), the Focus Blue/Coral/Gold
  palette, Space Grotesk headings over Inter body text, and the
  direct/peer-to-peer voice - not corporate transactional-email
  boilerplate.
  """

  @mark_image_url "https://raw.githubusercontent.com/okumuraven/Image_host/main/kuzana_mark.png"

  @doc """
  `opts`: %{headline:, body_html:, cta_text: (optional), cta_url: (optional)}.
  `body_html` is trusted, pre-built HTML supplied by each caller (not
  raw user input), so no escaping happens here.
  """
  def render(opts) do
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
                    <h1 style="font-family: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif; font-weight: 700; font-size: 25px; line-height: 1.25; color: #1a1a1a; margin: 0;">#{opts.headline}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 28px;">
                    #{opts.body_html}
                  </td>
                </tr>
                #{cta_row(Map.get(opts, :cta_text), Map.get(opts, :cta_url))}
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

  defp cta_row(nil, _), do: ""
  defp cta_row(_, nil), do: ""

  defp cta_row(text, url) do
    """
    <tr>
      <td style="padding: 0 40px 32px;">
        <a href="#{url}" style="display:inline-block; background:#4a6290; color:#ffffff; font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 15px; text-decoration:none; padding: 13px 28px; border-radius: 6px;">#{text}</a>
      </td>
    </tr>
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

  @doc "Shared greeting helper - first name from a full name, falls back gracefully."
  def first_name(nil), do: "there"
  def first_name(""), do: "there"
  def first_name(name), do: name |> String.split(" ") |> List.first()

  @doc "Shared frontend-origin lookup so every mailer's CTA points at the same place."
  def frontend_url, do: System.get_env("FRONTEND_URL") || "http://localhost:5173"
end
