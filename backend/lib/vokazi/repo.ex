defmodule Vokazi.Repo do
  use Ecto.Repo,
    otp_app: :vokazi,
    adapter: Ecto.Adapters.Postgres
end
