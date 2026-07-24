defmodule Vokazi.Investment.InvestmentProfile do
  use Ecto.Schema
  import Ecto.Changeset

  # Founder-side (business_stage, funding_amount_sought, key_financials)
  # and investor/lender-side (check_size, sectors_of_interest) fields
  # share one row - funding_types is shared by both ("what I want" for a
  # founder, "what I provide" for an investor/lender). Nothing here is
  # required beyond user_id: whichever half doesn't apply to a given
  # user is simply left blank, not validated against.
  @funding_types ["equity", "loan", "grant", "working_capital"]
  @business_stages ["Idea stage", "Early revenue", "Growing", "Established"]

  schema "investment_profiles" do
    field :business_stage, :string
    field :funding_amount_sought, :string
    field :funding_types, {:array, :string}, default: []
    field :key_financials, :string
    field :check_size, :string
    field :sectors_of_interest, {:array, :string}, default: []

    belongs_to :user, Vokazi.Accounts.User

    timestamps()
  end

  def funding_types, do: @funding_types
  def business_stages, do: @business_stages

  @doc false
  def changeset(profile, attrs) do
    profile
    |> cast(drop_blank_stage(attrs), [
      :business_stage,
      :funding_amount_sought,
      :funding_types,
      :key_financials,
      :check_size,
      :sectors_of_interest,
      :user_id
    ])
    |> validate_required([:user_id])
    |> validate_inclusion(:business_stage, @business_stages, message: "must be one of the listed stages")
    |> validate_tags(:funding_types, @funding_types)
    |> validate_tags(:sectors_of_interest, Vokazi.Accounts.User.industries())
    |> unique_constraint(:user_id)
  end

  # A blank/unset stage from a caller submitting only the other half of
  # this form should leave the existing value untouched, not fail
  # validation or overwrite it with nil - same pattern as
  # Vokazi.Accounts.User's industry field.
  defp drop_blank_stage(attrs) do
    case Map.get(attrs, "business_stage", Map.get(attrs, :business_stage)) do
      v when v in [nil, ""] -> attrs |> Map.delete("business_stage") |> Map.delete(:business_stage)
      _ -> attrs
    end
  end

  defp validate_tags(changeset, field, allowed) do
    validate_change(changeset, field, fn ^field, values ->
      invalid = Enum.reject(values, &(&1 in allowed))
      if invalid == [], do: [], else: [{field, "contains invalid values: #{Enum.join(invalid, ", ")}"}]
    end)
  end
end
