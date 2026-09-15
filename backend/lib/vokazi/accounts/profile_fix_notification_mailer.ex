defmodule Vokazi.Accounts.ProfileFixNotificationMailer do
  @moduledoc """
  One-off send for a member whose chat interview hit the now-fixed
  extraction fallback bug (InterviewChatController.finish/2 was saving
  their raw conversation as "Your Offer" instead of a real summary).
  Not a recurring worker - triggered manually by staff for the specific
  member(s) affected before Vokazi.Interviews.RetryUnsummarizedWorker
  existed to catch this automatically going forward.
  """

  alias Vokazi.Mailer
  alias Vokazi.Mailer.Template

  def send_notification(email, name) do
    html =
      Template.render(%{
        headline: "Your profile's been fixed, #{Template.first_name(name)}",
        body_html: """
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          We noticed your chat interview didn't get summarized correctly -
          a small bug on our side meant your "Your Offer" and "Your Need"
          weren't showing the clean summary they should have. That was on
          us, not you.
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0 0 16px;">
          It's fixed now - your profile has been re-processed from your
          original interview, so nothing on your end is needed. Feel free
          to take a look and make sure it reads the way you'd want.
        </p>
        <p style="font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0;">
          Thanks for your patience, and sorry for the inconvenience.
        </p>
        """,
        cta_text: "View my profile",
        cta_url: Template.frontend_url()
      })

    Mailer.deliver(email, "Your Kuzana Connect profile has been fixed", html)
  end
end
