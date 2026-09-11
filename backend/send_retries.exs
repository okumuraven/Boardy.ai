alias Vokazi.Repo
alias Vokazi.Accounts.{User, Profile, InterviewRetryMailer}
import Ecto.Query

query = from u in User,
  join: p in Profile, on: p.user_id == u.id,
  where: p.offer_text == "Not explicitly stated" or p.need_text == "Not explicitly stated",
  select: {u.email, u.full_name}

affected_users = Repo.all(query)

Enum.each(affected_users, fn {email, name} ->
  case InterviewRetryMailer.send_retry_invite(email, name) do
    :ok -> IO.puts("Successfully sent retry email to #{email}")
    error -> IO.puts("Failed to send to #{email}: #{inspect(error)}")
  end
end)
IO.puts("Finished sending to #{length(affected_users)} users.")
