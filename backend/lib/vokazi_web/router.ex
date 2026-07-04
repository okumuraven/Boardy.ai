defmodule VokaziWeb.Router do
  use VokaziWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", VokaziWeb do
    pipe_through :api

    get "/profiles/:id", ProfileController, :show
    post "/profiles/:id/sync_mock", ProfileController, :sync_mock
    post "/profiles/:id/sync_real_transcript", ProfileController, :sync_real_transcript
    post "/profiles", ProfileController, :create
    post "/vapi", VapiController, :webhook
    post "/matches/:id/confirm-payment", MatchController, :confirm_payment
    post "/matchmaking/stake", MatchController, :stake
  end
end
