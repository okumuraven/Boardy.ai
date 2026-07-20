defmodule VokaziWeb.Router do
  use VokaziWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  # Google's OAuth redirect lands here as a plain browser navigation
  # (Accept: text/html), so it can't go through the `:api` pipeline's
  # `:accepts, ["json"]` plug without a 406.
  pipeline :browser_redirect do
  end

  scope "/api", VokaziWeb do
    pipe_through :api

    get "/profiles/:id", ProfileController, :show
    post "/profiles/:id/sync_mock", ProfileController, :sync_mock
    post "/profiles/:id/sync_real_transcript", ProfileController, :sync_real_transcript
    post "/profiles", ProfileController, :create
    post "/vapi", VapiController, :webhook
    post "/matches/:id/respond", MatchController, :respond
    post "/matches/:id/confirm-stake", MatchController, :confirm_stake
    get "/matches/pending", MatchController, :pending_for_user
    get "/matches/:id/status", MatchController, :status
    post "/matchmaking/find_match", MatchController, :find_match

    # Escrow-Gated Google Calendar
    get "/matches/:id/schedule", SchedulingController, :show
    get "/matches/:id/schedule/status", SchedulingController, :status
    get "/matches/:id/schedule/connect_url", SchedulingController, :connect_url
    post "/matches/:id/schedule/decline_calendar", SchedulingController, :decline_calendar
    post "/matches/:id/schedule/availability", SchedulingController, :submit_availability
    post "/matches/:id/schedule/contact_preference", SchedulingController, :set_contact_preference
    post "/matches/:id/schedule/select_slot", SchedulingController, :select_slot
    post "/matches/:id/schedule/remind", SchedulingController, :remind

    # In-App Notification Hub (notification_system.md Phase 1)
    get "/notifications", NotificationController, :index
    post "/notifications/:id/read", NotificationController, :mark_read
    post "/notifications/mark_all_read", NotificationController, :mark_all_read

    # Web Push (notification_system.md Phase 2)
    post "/push_subscriptions", PushSubscriptionController, :create
    delete "/push_subscriptions", PushSubscriptionController, :delete
  end

  scope "/api/auth/google/calendar", VokaziWeb do
    pipe_through :browser_redirect

    get "/callback", GoogleOAuthController, :callback
  end
end
