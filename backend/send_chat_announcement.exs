# One-off email to members who haven't finished their interview,
# telling them about the new chat option - run once, manually, by a
# human: `mix run send_chat_announcement.exs`. Same "stuck" definition
# InterviewReminderWorker.stuck_unreminded_users/0 uses (missing
# offer_text/need_text or onboarding_completed == false), but
# deliberately without its interview_reminder_sent_at guard or 48h
# cutoff - this is meant to catch the whole current backlog, including
# everyone that one-shot worker already reminded once (and will never
# touch again by design) and everyone too recently signed up for it to
# have reached yet.
alias Vokazi.Repo
alias Vokazi.Accounts.{User, Profile, ChatOptionMailer}
import Ecto.Query

query =
  from u in User,
    left_join: p in Profile,
    on: p.user_id == u.id,
    where: u.onboarding_completed == false or is_nil(p.offer_text) or is_nil(p.need_text),
    where: not is_nil(u.email),
    select: {u.email, u.full_name}

affected_users = Repo.all(query)

Enum.each(affected_users, fn {email, name} ->
  case ChatOptionMailer.send_announcement(email, name) do
    :ok -> IO.puts("Successfully sent chat announcement to #{email}")
    error -> IO.puts("Failed to send to #{email}: #{inspect(error)}")
  end
end)

IO.puts("Finished sending to #{length(affected_users)} users.")
