defmodule Vokazi.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :email, :string
    field :full_name, :string
    field :role, :string
    field :industry, :string
    # The one real identity anchor - Google's stable per-account subject
    # id, set exactly once from a server-verified Google ID token
    # (`Vokazi.Auth.GoogleSignIn`) and never mutable through the normal
    # profile-edit changeset below. Previously stored a Thirdweb-derived
    # wallet address - renamed since this app has no blockchain
    # functionality left and a column named "wallet_address" holding a
    # Google subject id would be actively misleading.
    field :google_sub, :string
    field :onboarding_completed, :boolean, default: false
    # Free text, not closed sets like role/industry - members' locations
    # and companies aren't a fixed list. Explicitly asked for as "day
    # one" profile fields in kuzana_connect_discovery.md.
    field :location, :string
    field :company, :string
    field :bio, :string
    # Relative storage path under Vokazi.Accounts.MediaStorage's uploads
    # root (e.g. "avatars/42/ab3f-photo.jpg"), never a full URL - the
    # frontend always resolves it through the authenticated
    # ProfileMediaController.avatar/2 endpoint (see AttachmentBubble.jsx's
    # same blob-fetch pattern for chat attachments). Optional and
    # member-set only through Vokazi.Accounts.ProfileMedia.set_avatar/2,
    # never through changeset/2 below - it needs its own image-type/size
    # validation, not a plain cast.
    field :avatar_path, :string
    # Stamped by VokaziWeb.ChatRoomChannel whenever this user's chat
    # presence is untracked (backgrounded via the Page Visibility API,
    # or a real disconnect) - never cast by any member-facing changeset
    # below, only ever written by that channel directly via Repo.update.
    field :last_seen_at, :utc_datetime

    # Kuzana staff identity, layered on top of the same Google-verified
    # account every member has - never a second auth system. nil means
    # "not staff at all" (the overwhelming majority of rows). Neither
    # field is ever cast by google_signin_changeset/2 or changeset/2
    # below - the only path that can ever set them is admin_changeset/2,
    # used exclusively by Vokazi.Admin.* context modules and the
    # `mix admin.grant` bootstrap task. See "Admin panel.md" §2-3.
    field :admin_role, :string
    field :admin_status, :string
    # Staff-granted authenticity checkmark on a *member's* account -
    # distinct from admin_role/admin_status above (which are about staff
    # identity, not member trust signals). Also never member-castable.
    field :is_verified, :boolean, default: false
    # Staff-assigned cohort label (e.g. "Jan 2025") mirroring Kuzana's
    # real accelerator batches - only meaningful for the Bizi Buddy
    # System's same-batch pairing rule (kuzana_playbook.md §6). Free
    # text, not a closed set - batches are an open-ended, ongoing
    # sequence, not a fixed list. Never member-castable, same reason as
    # admin_role/is_verified above.
    field :batch, :string
    # Set exactly once, atomically, by the final Superadmin board
    # decision on a Bizi application (Vokazi.Admin.BiziApplications.
    # record_decision/4) - deliberately its own field, not reused from
    # is_verified (a generic authenticity checkmark) or batch (scoped
    # only to Bizi Buddy pairing). See bizi_verification_system.md §10.
    # Never member-castable, same reason as admin_role/is_verified above.
    field :is_bizi, :boolean, default: false
    field :bizi_approved_at, :utc_datetime
    # Set once, the moment `Vokazi.Accounts.InterviewReminderWorker`
    # actually sends the one-shot 48h nudge - never member/admin-castable,
    # purely internal bookkeeping so the same account is never reminded
    # twice. See that module's moduledoc for why it's one-shot, not recurring.
    field :interview_reminder_sent_at, :utc_datetime
    # Same one-shot bookkeeping pattern as interview_reminder_sent_at
    # above, for Vokazi.Accounts.FeedbackReminderWorker.
    field :feedback_reminder_sent_at, :utc_datetime

    has_one :profile, Vokazi.Accounts.Profile

    timestamps()
  end

  # Closed set, not free text - Vokazi.Reputation ranks users within
  # their role category, so a stray value here would either fragment
  # into its own lonely category or crash that grouping outright. Drawn
  # from the real member types in kuzana_connect_discovery.md's 15
  # interviews (founders, investors, lenders, consultants/advisors,
  # service providers) - not a generic tech-startup taxonomy. Investors
  # and lenders are deliberately distinct values (not one "capital-side"
  # role): the report's own finding (§4) is that lenders like Korir/Vula
  # look for a different qualifying signal (revenue threshold) than
  # equity investors like the NAIBAN member, even though both share the
  # same "capital-side" structured-profile UI (see Vokazi.Investment).
  @roles ["founder", "investor", "lender", "consultant", "service_provider"]

  # Closed set, not free text - drives the Directory's filter chips
  # (Vokazi.Directory). Drawn from the real industries Kuzana's own
  # members named in kuzana_connect_discovery.md, not a generic taxonomy.
  @industries [
    "Agribusiness",
    "Logistics",
    "Finance",
    "Sustainability",
    "Branding & Marketing",
    "Consulting",
    "Accounting",
    "Real Estate",
    "Technology",
    "Investment",
    "Retail & Consumer Goods",
    "Hospitality",
    "Other"
  ]

  def industries, do: @industries

  # Closed set for staff identity - see "Admin panel.md" §5. Deliberately
  # separate from @roles above (member-facing role taxonomy) - these are
  # never shown or castable through any member-facing surface.
  @admin_roles ["superadmin", "moderator", "support"]
  @admin_statuses ["active", "suspended"]

  def admin_roles, do: @admin_roles

  @doc """
  Creates the bare account identity - used exactly once, right after a
  Google ID token is verified (`Vokazi.Auth.GoogleSignIn`). `role`/
  `industry` aren't known yet at this point (they're chosen during
  `ProfileSetup`, a separate authenticated request afterward), so
  they're deliberately not required here the way `changeset/2` requires
  them. `google_sub` is never castable through `changeset/2` below - this
  is the only path that ever sets it, and only from a verified token,
  never from a client-supplied param.
  """
  def google_signin_changeset(user, attrs) do
    user
    |> cast(attrs, [:google_sub, :email, :full_name])
    |> validate_required([:google_sub])
    |> unique_constraint(:google_sub)
    |> unique_constraint(:email)
  end

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(drop_blank_industry(attrs), [
      :email,
      :full_name,
      :role,
      :industry,
      :onboarding_completed,
      :location,
      :company,
      :bio
    ])
    |> validate_required([:full_name, :role])
    |> validate_inclusion(:role, @roles)
    |> validate_inclusion(:industry, @industries, message: "must be one of the listed industries")
    |> unique_constraint(:email)
  end

  @doc """
  The only path that can ever set/clear avatar_path - used exclusively
  by `Vokazi.Accounts.ProfileMedia`, after that module has already
  validated the upload's image type/size and written the file to disk
  (or, for removal, deleted it). Deliberately its own changeset so
  neither `changeset/2`'s full profile-edit validations nor a stray
  client-supplied path can ever touch this field directly.
  """
  def avatar_changeset(user, attrs) do
    cast(user, attrs, [:avatar_path])
  end

  @doc """
  The ONLY path that can ever set admin_role/admin_status/is_verified/
  batch/is_bizi/bizi_approved_at - used exclusively by `Vokazi.Admin.*`
  context modules and the `mix admin.grant` bootstrap task, never by any
  member-facing controller. Each field is independently optional here
  (e.g. a suspend action only touches admin_status, an invite-acceptance
  only touches admin_role + admin_status) - callers pass just what
  they're changing.
  """
  def admin_changeset(user, attrs) do
    user
    |> cast(attrs, [:admin_role, :admin_status, :is_verified, :batch, :is_bizi, :bizi_approved_at])
    |> validate_inclusion(:admin_role, @admin_roles)
    |> validate_inclusion(:admin_status, @admin_statuses)
  end

  @doc """
  The minimal self-service edit a newly-accepted admin makes about
  themselves (name/location) right after accepting an invite - deliberately
  narrow, same reason `admin_changeset/2` never touches these: an admin
  editing their own name must never be able to also touch their own
  `admin_role`/`admin_status` through the same request.
  """
  def admin_self_changeset(user, attrs) do
    cast(user, attrs, [:full_name, :location])
  end

  # A blank/unset industry from a caller that doesn't know about this field
  # yet (or a placeholder "choose one" option) should leave the existing
  # value untouched, not fail validation or overwrite it with nil.
  defp drop_blank_industry(attrs) do
    case Map.get(attrs, "industry", Map.get(attrs, :industry)) do
      v when v in [nil, ""] -> attrs |> Map.delete("industry") |> Map.delete(:industry)
      _ -> attrs
    end
  end
end
