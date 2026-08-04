defmodule Vokazi.Bizi.Reference do
  use Ecto.Schema
  import Ecto.Changeset

  # The real 5-customer + 5-creditor reference-check list
  # (bizi_verification.md stage 5) - one row per reference, not ten
  # near-identical columns, matching kuzana_playbook.md §9's own
  # database rules.
  @reference_types ["customer", "creditor"]

  schema "bizi_application_references" do
    field :reference_type, :string
    field :name, :string
    field :phone, :string
    field :contacted, :boolean, default: false
    field :verified, :boolean, default: false
    field :notes, :string

    belongs_to :bizi_application, Vokazi.Bizi.Application

    timestamps()
  end

  def reference_types, do: @reference_types

  @doc false
  def changeset(reference, attrs) do
    reference
    |> cast(attrs, [:bizi_application_id, :reference_type, :name, :phone, :contacted, :verified, :notes])
    |> validate_required([:bizi_application_id, :reference_type, :name])
    |> validate_inclusion(:reference_type, @reference_types)
  end
end
