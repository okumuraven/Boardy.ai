defmodule Vokazi.Bizi.StageEvent do
  use Ecto.Schema
  import Ecto.Changeset

  # The real case-file timeline (bizi_verification_system.md §4) - every
  # stage transition, AI screening pass, automated reminder, and the
  # final decision writes exactly one row here. This is what "who did
  # each stage, with what comment" actually renders from - never
  # reconstructed from the generic admin_audit_logs table, which still
  # gets its own entry too for security-review purposes.
  @kinds ["stage_change", "ai_screening", "reminder", "note", "decision"]

  schema "bizi_application_stage_events" do
    field :kind, :string
    field :from_status, :string
    field :to_status, :string
    field :comment, :string

    belongs_to :bizi_application, Vokazi.Bizi.Application
    # Nullable on purpose - null means system-generated (AI screening,
    # an automated reminder), never a human misattributed as "the
    # system" or vice versa.
    belongs_to :performed_by_admin, Vokazi.Accounts.User, foreign_key: :performed_by_admin_id

    timestamps(updated_at: false)
  end

  def kinds, do: @kinds

  @doc false
  def changeset(event, attrs) do
    event
    |> cast(attrs, [:bizi_application_id, :kind, :from_status, :to_status, :performed_by_admin_id, :comment])
    |> validate_required([:bizi_application_id, :kind])
    |> validate_inclusion(:kind, @kinds)
  end
end
