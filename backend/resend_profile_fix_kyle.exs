# One-off corrected resend: the first send of
# Vokazi.Accounts.ProfileFixNotificationMailer to kyle@kuzana.co went out
# with a localhost link because it was run from the local dev container
# (FRONTEND_URL=http://localhost:5173 there) instead of production. This
# re-sends the same notification from production, where FRONTEND_URL
# resolves to the real domain.
#
# Usage (run inside the backend container/production machine):
#   mix run resend_profile_fix_kyle.exs

case Vokazi.Accounts.ProfileFixNotificationMailer.send_notification("kyle@kuzana.co", "Kyle Schutter") do
  :ok -> IO.puts("Sent successfully to kyle@kuzana.co (link: #{Vokazi.Mailer.Template.frontend_url()})")
  {:error, reason} -> IO.puts("Failed: #{inspect(reason)}")
end
