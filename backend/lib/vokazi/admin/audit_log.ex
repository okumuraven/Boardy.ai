defmodule Vokazi.Admin.AuditLog do
  @moduledoc """
  Every admin *mutation* (verifying a member, inviting/suspending/re-tiering
  another admin, recording a match outcome, manually creating a match) gets
  one of these, inserted in the SAME `Ecto.Multi` transaction as the
  mutation itself - the data change cannot commit without its audit row, or
  vice versa. See "Admin panel.md" §3.

  Deliberately does NOT log routine reads (viewing a member's profile,
  browsing matches) - those go to structured application logs instead
  (`VokaziWeb.AdminPlug` sets `Logger.metadata(admin_user_id: ...)`, each
  admin controller read action logs a line). This keeps this table
  meaningful - real decisions, not noise.
  """
  use Ecto.Schema
  import Ecto.Changeset

  schema "admin_audit_logs" do
    field :action, :string
    field :target_type, :string
    field :target_id, :integer
    field :reason, :string
    field :metadata, :map, default: %{}
    field :ip_address, :string

    belongs_to :admin_user, Vokazi.Accounts.User

    timestamps(updated_at: false)
  end

  @doc false
  def changeset(audit_log, attrs) do
    audit_log
    |> cast(attrs, [:admin_user_id, :action, :target_type, :target_id, :reason, :metadata, :ip_address])
    |> validate_required([:admin_user_id, :action, :target_type])
  end
end
