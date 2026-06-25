defmodule BoardyWeb.Router do
  use BoardyWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", BoardyWeb do
    pipe_through :api

    get "/profiles/:id", ProfileController, :show
    post "/profiles", ProfileController, :create
    post "/vapi", VapiController, :webhook
    post "/matches/:id/confirm-payment", MatchController, :confirm_payment
  end
end
