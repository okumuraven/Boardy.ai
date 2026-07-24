defmodule Vokazi.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :email, :string
    field :full_name, :string
    field :role, :string
    field :industry, :string
    field :wallet_address, :string
    field :onboarding_completed, :boolean, default: false

    has_one :profile, Vokazi.Accounts.Profile

    timestamps()
  end

  # Closed set, not free text - Vokazi.Reputation ranks users within
  # their role category, so a stray value here would either fragment
  # into its own lonely category or crash that grouping outright.
  @roles ["founder", "developer", "designer", "investor"]

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

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(drop_blank_industry(attrs), [:email, :full_name, :role, :industry, :wallet_address, :onboarding_completed])
    |> validate_required([:wallet_address, :full_name, :role])
    |> validate_inclusion(:role, @roles)
    |> validate_inclusion(:industry, @industries, message: "must be one of the listed industries")
    |> unique_constraint(:wallet_address)
    |> unique_constraint(:email)
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
