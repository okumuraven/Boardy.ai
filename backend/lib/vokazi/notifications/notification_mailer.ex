defmodule Vokazi.Notifications.NotificationMailer do
  @moduledoc """
  Email mirror for the small set of in-app notification types
  worth an email (see `Vokazi.Notifications.notify/4`'s `@email_types`)
  - reuses the exact same `body` text already written for the in-app/
  push versions of these events instead of maintaining separate copy.
  """

  alias Vokazi.Mailer
  alias Vokazi.Mailer.Template

  @subjects %{
    "new_match" => "You've got a new match on Kuzana Connect",
    "buddy_paired" => "You've been paired with a Bizi Buddy",
    "calendar_slot" => "Your Kuzana Connect intro is confirmed"
  }

  def send_event(email, name, type, body) do
    html =
      Template.render(%{
        headline: "Hey #{Template.first_name(name)}.",
        body_html: """
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0;">
          #{body}
        </p>
        """,
        cta_text: "Open Kuzana Connect",
        cta_url: Template.frontend_url()
      })

    Mailer.deliver(email, Map.get(@subjects, type, "Kuzana Connect update"), html)
  end
end
