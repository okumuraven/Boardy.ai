defmodule VokaziWeb.Router do
  use VokaziWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  # Every route except sign-in itself (and the Vapi webhook, which is a
  # server-to-server call with its own secret check, not a user session)
  # requires a verified session - `conn.assigns.current_user_id` is the
  # only trustworthy source of "who is this request from" anywhere in
  # this app now. See `VokaziWeb.AuthPlug`.
  pipeline :authenticated_api do
    plug :accepts, ["json"]
    plug VokaziWeb.AuthPlug
  end

  # Kuzana staff only - same identity flow as everyone else (AuthPlug),
  # plus a fresh-per-request admin_role/admin_status check (AdminPlug).
  # See "Admin panel.md" §4.
  pipeline :admin_api do
    plug :accepts, ["json"]
    plug VokaziWeb.AuthPlug
    plug VokaziWeb.AdminPlug
  end

  # Google's OAuth redirect lands here as a plain browser navigation
  # (Accept: text/html), so it can't go through the `:api` pipeline's
  # `:accepts, ["json"]` plug without a 406.
  pipeline :browser_redirect do
  end

  scope "/api", VokaziWeb do
    pipe_through :api

    # The one entry point into this app - every other route requires the
    # session token this issues.
    post "/auth/google/signin", AuthController, :google_signin

    # Server-to-server webhook from Vapi, not a user session - verifies
    # its own shared secret inline instead of going through AuthPlug.
    post "/vapi", VapiController, :webhook
  end

  scope "/api", VokaziWeb do
    pipe_through :authenticated_api

    get "/profiles/me", ProfileController, :show
    post "/profiles/sync_mock", ProfileController, :sync_mock
    post "/profiles/sync_real_transcript", ProfileController, :sync_real_transcript
    post "/profiles", ProfileController, :update

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
    get "/profiles/social", SocialProfileController, :show
    post "/profiles/social/links", SocialProfileController, :upsert_links
    get "/profiles/social/github/connect_url", SocialProfileController, :github_connect_url
    delete "/profiles/social/github", SocialProfileController, :github_disconnect

    # Reputation - connections/rank, and the redacted match-counterpart reveal
    get "/profiles/stats", ReputationController, :own_stats
    get "/matches/:id/counterpart_profile", ReputationController, :counterpart_profile

    # Investor & Lender View - optional structured funding/investment layer (Phase 4)
    get "/profiles/investment", InvestmentController, :show
    post "/profiles/investment", InvestmentController, :upsert

    # In-App Calling - self-hosted STUN/TURN credentials (Phase 1, call_feature.md)
    get "/calls/turn_credentials", TurnCredentialsController, :show

    # In-App Calling - dedicated call history view (Phase 3 polish)
    get "/calls/history", CallHistoryController, :index
  end

  # Admin invite acceptance - public and unauthenticated by necessity
  # (the whole point is signing in for the very first time), protected
  # instead by the invite token itself, its expiry, and an exact Google
  # account match. See VokaziWeb.Admin.InviteAcceptController.
  scope "/api/admin", VokaziWeb.Admin do
    pipe_through :api

    get "/invites/:token", InviteAcceptController, :show
    post "/invites/:token/accept", InviteAcceptController, :accept
  end

  scope "/api/admin", VokaziWeb.Admin do
    pipe_through :admin_api

    get "/whoami", MemberController, :whoami
    patch "/me", MemberController, :update_me

    get "/members", MemberController, :index
    get "/members/:id", MemberController, :show
    patch "/members/:id/verify", MemberController, :set_verified
    post "/members/:id/reveal_phone", MemberController, :reveal_phone

    get "/matches", MatchController, :index
    get "/matches/decline_reasons", MatchController, :decline_reasons
    get "/matches/:id", MatchController, :show
    post "/matches", MatchController, :create
    post "/matches/:id/outcome", MatchController, :record_outcome

    get "/schedules", ScheduleController, :index
    get "/schedules/:id", ScheduleController, :show

    get "/stats", StatsController, :show

    # Superadmin only - checked inside each action, not just by the pipeline
    get "/admins", AdminAccountController, :index
    post "/admins/invite", AdminAccountController, :invite
    delete "/admins/invites/:id", AdminAccountController, :revoke_invite
    patch "/admins/:id/role", AdminAccountController, :set_role
    patch "/admins/:id/suspend", AdminAccountController, :suspend
    patch "/admins/:id/reactivate", AdminAccountController, :reactivate
    get "/audit_logs", AdminAccountController, :audit_logs
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
