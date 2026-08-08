defmodule Vokazi.Accounts.Profile do
  use Ecto.Schema
  import Ecto.Changeset

  schema "profiles" do
    field :phone_number, :string
    field :raw_transcript, :string
    field :need_text, :string
    field :offer_text, :string
    field :need_vector, Pgvector.Ecto.Vector
    field :offer_vector, Pgvector.Ecto.Vector
    # AI-inferred from the voice-interview transcript ("call" | "video" |
    # "chat") - the default shown on the scheduling briefing card.
    field :contact_preference, :string, default: "call"
    # Auto-extracted (Vokazi.AI.extract_tags/2) from offer_text/need_text -
    # what the Directory (Vokazi.Directory) filters on, separate from the
    # free-text semantic matching pgvector already does.
    field :looking_for_tags, {:array, :string}, default: []
    field :can_help_tags, {:array, :string}, default: []
    # Relative storage paths (Vokazi.Accounts.MediaStorage), never full
    # URLs - resolved through ProfileMediaController's authenticated
    # owner-or-public gate. Optional, capped at 3
    # (Vokazi.Accounts.ProfileMedia.add_business_photo/2 enforces this;
    # there's no DB-level array-length constraint since Ecto/Postgres
    # array columns don't offer one cheaply). Never member-castable
    # through changeset/2 below - only through ProfileMedia, same
    # separation of concerns as avatar_path on User.
    field :business_photos, {:array, :string}, default: []
    # Off by default - a member must opt in before these photos are
    # visible to anyone but themselves (see the visibility toggle in
    # ProfilePhotos.jsx). Only castable through photos_visibility_changeset/2.
    field :business_photos_public, :boolean, default: false
    # Service/advisory-specific (profile.md §4.2) - only meaningful for
    # consultant/service_provider roles, but not role-validated here
    # (same reasoning as InvestmentProfile: whichever half doesn't apply
    # to a given user is simply left blank). Only castable through
    # service_details_changeset/2 below.
    field :rate_types, {:array, :string}, default: []
    # Nullable, not default-true/false - nil means "never set" (no pill
    # shown at all), distinct from an explicit false ("not taking
    # clients right now").
    field :available_for_hire, :boolean
    # Whether a human on staff has actually reached this member on
    # phone_number - never the member's own claim. Only castable through
    # confirm_phone_changeset/2 below, set exclusively by
    # Vokazi.Admin.Members.confirm_phone/3.
    field :phone_confirmed, :boolean, default: false

    belongs_to :user, Vokazi.Accounts.User

    timestamps()
  end

  # Closed set - drawn directly from what Kuzana's own members named in
  # kuzana_connect_discovery.md ("What they are looking for"). Any tag
  # outside this set is either an AI extraction bug or a hand-crafted
  # request that doesn't belong in a filterable field.
  @connection_tags ["funding", "customers", "partners", "mentors", "hiring"]

  def connection_tags, do: @connection_tags

  # Closed set - how a consultant/service provider actually gets paid,
  # not a free-text field (profile.md §4.2). Same "hourly, retainer, or
  # project-based" shape called out in that doc.
  @rate_types ["hourly", "retainer", "project"]

  def rate_types, do: @rate_types

  # Kenyan mobile numbers only, after normalize_phone/1 has stripped
  # spaces/dashes: 07XXXXXXXX or +2547XXXXXXXX (Safaricom/Airtel, prefix
  # 7) and the same shapes with a leading 1 (Telkom/Equitel).
  @phone_format ~r/^(?:\+254|0)(?:7|1)\d{8}$/

  @doc false
  def changeset(profile, attrs) do
    profile
    |> cast(attrs, [
      :phone_number,
      :raw_transcript,
      :need_text,
      :offer_text,
      :need_vector,
      :offer_vector,
      :contact_preference,
      :looking_for_tags,
      :can_help_tags,
      :user_id
    ])
    # phone_number is genuinely optional (ProfileSetup.jsx labels it so) -
    # it used to be in validate_required here too, which silently forced
    # anyone submitting a blank field to fail the whole profile save,
    # pushing people who didn't want to share a real number toward typing
    # a guessed one just to get past the form. Format is still enforced
    # below whenever a value IS present.
    |> update_change(:phone_number, &normalize_phone/1)
    |> validate_change(:phone_number, fn :phone_number, value ->
      if value == nil or Regex.match?(@phone_format, value) do
        []
      else
        [phone_number: "must be a valid Kenyan phone number, e.g. 0712345678 or +254712345678"]
      end
    end)
    |> validate_required([:user_id])
    |> validate_inclusion(:contact_preference, ["call", "video", "chat"])
    |> validate_tags(:looking_for_tags, @connection_tags)
    |> validate_tags(:can_help_tags, @connection_tags)
    |> unique_constraint(:user_id)
    |> unique_constraint(:phone_number, message: "is already registered to another account")
  end

  defp normalize_phone(nil), do: nil

  defp normalize_phone(value) do
    trimmed = value |> String.replace(~r/[\s\-]/, "") |> String.trim()
    if trimmed == "", do: nil, else: trimmed
  end

  @doc """
  The only path that can ever change business_photos/
  business_photos_public - used exclusively by
  `Vokazi.Accounts.ProfileMedia`, mirroring User.avatar_changeset/2's
  same separation from the general-purpose changeset/2 above.
  """
  def photos_changeset(profile, attrs) do
    cast(profile, attrs, [:business_photos, :business_photos_public])
  end

  @doc """
  The only path that can ever change rate_types/available_for_hire -
  same separation-of-concerns pattern as photos_changeset/2 above, kept
  out of the general changeset/2 since these two fields are meaningless
  for most roles.
  """
  def service_details_changeset(profile, attrs) do
    profile
    |> cast(attrs, [:rate_types, :available_for_hire])
    |> validate_tags(:rate_types, @rate_types)
  end

  @doc """
  The only path that can ever change phone_confirmed - exclusively used
  by `Vokazi.Admin.Members.confirm_phone/3`, same separation-of-concerns
  pattern as photos_changeset/2 and service_details_changeset/2 above. A
  member can never set this on themselves through changeset/2.
  """
  def confirm_phone_changeset(profile, attrs) do
    cast(profile, attrs, [:phone_confirmed])
  end

  @doc """
  The individual criteria behind complete?/2, broken out so
  `VokaziWeb.ProfileController.show/2` can hand the frontend a
  checklist/percentage (ProfileCompletion.jsx) instead of only a
  pass/fail boolean - a member should see exactly what's left, not just
  that something is.
  """
  def completion_checklist(user, profile) do
    %{
      photo: !!(user && user.avatar_path),
      interview: !!(profile && profile.offer_text && profile.need_text),
      phone_confirmed: !!(profile && profile.phone_confirmed)
    }
  end

  @doc """
  The public "profile complete" checkmark shown on directory cards
  (Instagram-style) - deliberately NOT the same thing as
  `Vokazi.Accounts.User`'s `is_verified` field, which is Felicity's
  staff-reviewed Applications screening judgment (Admin panel.md §5).
  This one requires no staff judgment call at all: every criterion in
  completion_checklist/2 (a profile picture, a finished voice
  interview, and a phone number staff has actually confirmed reachable
  - not just well-formed, since the whole point is it can't be earned
  with a guessed number). Any member can earn it purely by finishing
  their own profile.
  """
  def complete?(user, profile) do
    user
    |> completion_checklist(profile)
    |> Map.values()
    |> Enum.all?()
  end

  defp validate_tags(changeset, field, allowed) do
    validate_change(changeset, field, fn ^field, tags ->
      invalid = Enum.reject(tags, &(&1 in allowed))
      if invalid == [], do: [], else: [{field, "contains invalid tags: #{Enum.join(invalid, ", ")}"}]
    end)
  end
end
