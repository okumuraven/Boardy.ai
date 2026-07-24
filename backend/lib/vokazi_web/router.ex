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
    get "/matches", MatchController, :index
    get "/matches/pending", MatchController, :pending_for_user
    get "/matches/:id/status", MatchController, :status
    post "/matchmaking/find_match", MatchController, :find_match

    # Searchable/filterable member directory (Phase 4)
    get "/directory", DirectoryController, :index
    post "/directory/connect", DirectoryController, :connect

    # Escrow-Gated Google Calendar
    get "/schedules", SchedulingController, :calendar
    get "/matches/:id/schedule", SchedulingController, :show
    get "/matches/:id/schedule/status", SchedulingController, :status
    get "/matches/:id/schedule/connect_url", SchedulingController, :connect_url
    get "/matches/:id/schedule/my_free_days", SchedulingController, :my_free_days
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

    # Personal agenda items - user-owned, never match-scoped
    get "/personal_events", PersonalEventController, :index
    post "/personal_events", PersonalEventController, :create
    delete "/personal_events/:id", PersonalEventController, :delete

    # Social profile - GitHub (OAuth-verified) + LinkedIn/X/portfolio links
    get "/profiles/:user_id/social", SocialProfileController, :show
    post "/profiles/:user_id/social/links", SocialProfileController, :upsert_links
    get "/profiles/:user_id/social/github/connect_url", SocialProfileController, :github_connect_url
    delete "/profiles/:user_id/social/github", SocialProfileController, :github_disconnect

    # Reputation - connections/rank, and the redacted match-counterpart reveal
    get "/profiles/:user_id/stats", ReputationController, :own_stats
    get "/matches/:id/counterpart_profile", ReputationController, :counterpart_profile

    # Investor & Lender View - optional structured funding/investment layer (Phase 4)
    get "/profiles/:user_id/investment", InvestmentController, :show
    post "/profiles/:user_id/investment", InvestmentController, :upsert

    # In-App Calling - self-hosted STUN/TURN credentials (Phase 1, call_feature.md)
    get "/calls/turn_credentials", TurnCredentialsController, :show

    # In-App Calling - dedicated call history view (Phase 3 polish)
    get "/calls/history", CallHistoryController, :index
  end

  scope "/api/auth/google/calendar", VokaziWeb do
    pipe_through :browser_redirect

    get "/callback", GoogleOAuthController, :callback
  end

  scope "/api/auth/github", VokaziWeb do
    pipe_through :browser_redirect

    get "/callback", GithubOAuthController, :callback
  end
end
