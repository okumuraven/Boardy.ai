defmodule Vokazi.Accounts.WelcomeMailer do
  @moduledoc """
  First email a brand-new member gets, right after their very first
  Google Sign-In - nudges straight at the next real step (the voice
  interview), since a member with no profile yet can't be matched with
  anyone. Fired from `Vokazi.Accounts.WelcomeEmailWorker`, never called
  directly from the sign-in request itself (see that module's moduledoc
  for why).
  """

  alias Vokazi.Mailer
  alias Vokazi.Mailer.Template

  def send_welcome(email, name) do
    html =
      Template.render(%{
        headline: "Welcome, #{Template.first_name(name)}.",
        body_html: """
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0;">
          You're in Kuzana Connect. Next up: a quick voice interview so we
          know who to introduce you to - what you offer, what you need,
          and who's the right fit.
        </p>
        """,
        cta_text: "Start your interview",
        cta_url: Template.frontend_url()
      })

    Mailer.deliver(email, "Welcome to Kuzana Connect", html)
  end
end
