defmodule BoardyWeb.Router do
  use BoardyWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", BoardyWeb do
    pipe_through :api

    get "/profiles/:id", ProfileController, :show
    post "/profiles", ProfileController, :create
  end
end
