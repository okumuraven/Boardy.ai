defmodule Vokazi.Accounts.WelcomeEmailWorker do
  @moduledoc """
  Sends the welcome email asynchronously via Oban rather than inline
  during `AuthController.google_signin/2` - a slow/failed Resend call
  should never delay or fail someone's actual sign-in response. Oban
  also gives this automatic retries, unlike a bare `Task.start/1`.
  """
  use Oban.Worker, queue: :mailers, max_attempts: 3

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Accounts.WelcomeMailer

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"user_id" => user_id}}) do
    case Repo.get(User, user_id) do
      %{email: email} = user when is_binary(email) -> WelcomeMailer.send_welcome(email, user.full_name)
      _ -> :ok
    end
  end
end
