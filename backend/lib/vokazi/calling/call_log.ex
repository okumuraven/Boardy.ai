defmodule Vokazi.Calling.CallLog do
  use Ecto.Schema
  import Ecto.Changeset

  @statuses ~w(ringing in_progress completed missed declined cancelled)

  schema "call_logs" do
    field :status, :string, default: "ringing"
    field :duration_seconds, :integer

    belongs_to :match, Vokazi.Matchmaking.Match
    belongs_to :caller, Vokazi.Accounts.User
    belongs_to :callee, Vokazi.Accounts.User

    timestamps()
  end

  def statuses, do: @statuses

  @doc false
  def changeset(call_log, attrs) do
    call_log
    |> cast(attrs, [:match_id, :caller_id, :callee_id, :status, :duration_seconds])
    |> validate_required([:match_id, :caller_id, :callee_id, :status])
    |> validate_inclusion(:status, @statuses)
  end
end
