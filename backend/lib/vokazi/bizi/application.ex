defmodule Vokazi.Bizi.Application do
  use Ecto.Schema
  import Ecto.Changeset

  # Verbatim from the real live application form (form.kuzana.co/apply,
  # captured in kuzana_website.md §9) - Kuzana's own program-track
  # taxonomy. Deliberately kept separate from Vokazi.Accounts.User's
  # `industry` enum - the two lists don't map 1:1 (Fintech vs. Finance,
  # Construction and Cosmetics & Fashion don't exist in `industry` at
  # all). See bizi_flow.md §3 and frontend `constants/biziTracks.js`.
  @tracks [
    "Hospitality & Tourism",
    "Logistics, Import & Export",
    "Fintech",
    "Construction",
    "Agri-Processing & Manufacturing",
    "Retail & D2C",
    "Cosmetics & Fashion",
    "Other"
  ]

  # The real form's own list, plus one addition - "Kuzana Connect" is a
  # lead source the original form predates (bizi_flow.md §3).
  @heard_about_options [
    "Referral",
    "Facebook",
    "Instagram",
    "Reapplication",
    "Kuzana staff called or emailed you",
    "LinkedIn",
    "Google/Search",
    "TikTok",
    "Kuzana Connect",
    "Other"
  ]

  # The real form's "must meet ALL below requirements" checklist
  # (kuzana_website.md §9) - stored as a map (see the migration) so this
  # is one source of truth for both the changeset validation below and
  # the frontend's grouped display (bizi_flow.md §4), rather than ten
  # near-identical boolean fields.
  @eligibility_keys [
    "operating_in_kenya",
    "lives_in_kenya",
    "revenue_ambition_7yr",
    "revenue_traction",
    "wants_equity",
    "coachable",
    "time_commitment",
    "professional_accounting",
    "monthly_reconciliation",
    "reliable_email"
  ]

  # The real 7-stage pipeline (bizi_verification.md / bizi_verification_system.md
  # §2) - `verification` deliberately collapses the DD visit, the 5+5
  # reference checks, and the finance/tax check into one stage, since in
  # practice they happen together around a single site visit. Any stage
  # can go straight to `declined` - decline isn't only a board_review
  # outcome.
  @statuses [
    "submitted",
    "screening",
    "documents_requested",
    "verification",
    "expert_review",
    "board_review",
    "approved",
    "declined"
  ]

  schema "bizi_applications" do
    field :preferred_name, :string
    field :other_names, :string
    field :email, :string
    field :whatsapp, :string
    field :company_name, :string
    field :business_description, :string
    # An array, not a single value - the real form says "Track(s)",
    # plural. Caught on manual review after the first real submission
    # only recorded one (see bizi_flow.md's changelog note).
    field :track, {:array, :string}, default: []
    field :heard_about_us, :string
    field :referred_by, :string
    field :eligibility, :map, default: %{}
    field :question_for_us, :string
    field :batch_target, :string
    field :status, :string, default: "submitted"

    # Staff-driven verification fields (bizi_verification_system.md §3) -
    # structured facts only. The narrative (who did what, with what
    # comment) lives entirely in Vokazi.Bizi.StageEvent, never duplicated
    # here - kuzana_playbook.md §9's "enter each fact once" rule.
    field :revenue_verified, :boolean, default: false
    field :board_decision_reason, :string
    field :decided_at, :utc_datetime
    # The current booked verification call (Phase D) - overwritten on
    # rebooking, same "most recent only" choice as the interview
    # transcript. Vokazi.Bizi.StageEvent still carries the permanent
    # audit trail of every booking; these two exist purely so the
    # applicant's own Bizi tab and the Calendar tab have real,
    # queryable data instead of a staff-only comment string to parse.
    field :scheduled_call_at, :utc_datetime
    field :scheduled_call_meet_link, :string
    belongs_to :assigned_to_admin, Vokazi.Accounts.User, foreign_key: :assigned_to_admin_id
    belongs_to :decided_by_admin, Vokazi.Accounts.User, foreign_key: :decided_by_admin_id

    belongs_to :user, Vokazi.Accounts.User
    # Ecto's default has_many foreign-key inference is :application_id
    # (derived from this module's own name) - explicit here because the
    # real migration columns are :bizi_application_id, matching the
    # table name convention, not the schema module's bare name. Nothing
    # currently preloads through these (the admin context queries the
    # child tables directly), but leaving the default wrong would be a
    # runtime landmine for the first future caller that does.
    has_many :stage_events, Vokazi.Bizi.StageEvent, foreign_key: :bizi_application_id
    has_many :references, Vokazi.Bizi.Reference, foreign_key: :bizi_application_id

    timestamps()
  end

  def tracks, do: @tracks
  def heard_about_options, do: @heard_about_options
  def eligibility_keys, do: @eligibility_keys
  def statuses, do: @statuses

  @doc false
  def changeset(application, attrs) do
    application
    |> cast(attrs, [
      :user_id,
      :preferred_name,
      :other_names,
      :email,
      :whatsapp,
      :company_name,
      :business_description,
      :track,
      :heard_about_us,
      :referred_by,
      :eligibility,
      :question_for_us,
      :batch_target
    ])
    |> validate_required([
      :user_id,
      :preferred_name,
      :email,
      :whatsapp,
      :company_name,
      :business_description,
      :heard_about_us
    ])
    |> validate_length(:business_description,
      min: 70,
      max: 140,
      message: "must be 70-140 characters, matching Kuzana's real application form"
    )
    |> validate_tracks()
    |> validate_inclusion(:heard_about_us, @heard_about_options)
    |> validate_all_eligibility_checked()
  end

  # validate_required/validate_inclusion don't work on array fields the
  # way they do on scalars - `[]` isn't nil (so validate_required would
  # silently accept an empty selection), and validate_inclusion checks
  # the whole field against the list rather than each element. Track(s)
  # is genuinely multi-select on the real form - at least one, every
  # value from the real closed set.
  defp validate_tracks(changeset) do
    tracks = get_field(changeset, :track) || []

    cond do
      tracks == [] ->
        add_error(changeset, :track, "must select at least one track")

      Enum.any?(tracks, &(&1 not in @tracks)) ->
        add_error(changeset, :track, "contains a track outside Kuzana's real list")

      true ->
        changeset
    end
  end

  @doc """
  Staff-driven updates only - status, assignment, and the final decision.
  Deliberately separate from `changeset/2` above: an admin advancing an
  application through the pipeline should never re-trigger the
  applicant-submission validations (description length, eligibility-all-
  checked), and a member editing their own application should never be
  able to touch `status`/`assigned_to_admin_id`/decision fields through
  the member-facing endpoint - there is no path that casts both sets.
  """
  def admin_changeset(application, attrs) do
    application
    |> cast(attrs, [
      :status,
      :assigned_to_admin_id,
      :revenue_verified,
      :board_decision_reason,
      :decided_by_admin_id,
      :decided_at,
      :scheduled_call_at,
      :scheduled_call_meet_link
    ])
    |> validate_inclusion(:status, @statuses)
  end

  # Kuzana's own rule is explicit: "Must meet ALL below requirements" -
  # not most, not a score threshold. A partially-checked submission is
  # rejected outright rather than silently accepted with gaps.
  defp validate_all_eligibility_checked(changeset) do
    eligibility = get_field(changeset, :eligibility) || %{}

    missing =
      Enum.reject(@eligibility_keys, fn key ->
        eligibility[key] == true or eligibility[to_string(key)] == true
      end)

    if missing == [] do
      changeset
    else
      add_error(changeset, :eligibility, "all eligibility items must be checked", missing: missing)
    end
  end
end
