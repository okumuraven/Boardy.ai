defmodule Boardy.Repo do
  use Ecto.Repo,
    otp_app: :boardy,
    adapter: Ecto.Adapters.Postgres
end
