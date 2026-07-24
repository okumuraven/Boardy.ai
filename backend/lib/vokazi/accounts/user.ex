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
