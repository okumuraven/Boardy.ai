defmodule Vokazi.Admin.FeatureAnnouncementMailer do
  @moduledoc "The broadcast email a member gets when staff announce a new feature - see `Vokazi.Admin.FeatureAnnouncements`."

  alias Vokazi.Mailer
  alias Vokazi.Mailer.Template

  def send_announcement(email, name, title, message) do
    html =
      Template.render(%{
        headline: title,
        body_html: """
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          Hey #{Template.first_name(name)} -
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0;">
          #{message}
        </p>
        """,
        cta_text: "Try it out",
        cta_url: Template.frontend_url()
      })

    Mailer.deliver(email, "New on Kuzana Connect: #{title}", html)
  end
end
