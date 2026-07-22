defmodule Vokazi.SocialProfiles.SocialProfile do
  use Ecto.Schema
  import Ecto.Changeset

  # Domains checked loosely against a Regex, not full URL parsing - this
  # is trust-on-submit verification (see social_media.md), not real
  # ownership proof. Just enough to stop garbage/unsafe values before
  # they're ever rendered as a link.
  @url_regex ~r/^https?:\/\/[^\s]+$/i
  @linkedin_regex ~r/linkedin\.com/i
  @x_regex ~r/(x\.com|twitter\.com)/i

  schema "social_profiles" do
    field :github_username, :string
    field :github_summary, :map
    field :linkedin_url, :string
    field :x_url, :string
    field :portfolio_url, :string

    belongs_to :user, Vokazi.Accounts.User

    timestamps()
  end

  @doc false
  def link_changeset(profile, attrs) do
    profile
    |> cast(attrs, [:user_id, :linkedin_url, :x_url, :portfolio_url])
    |> validate_required([:user_id])
    |> validate_url(:linkedin_url, @linkedin_regex)
    |> validate_url(:x_url, @x_regex)
    |> validate_url(:portfolio_url, nil)
    |> unique_constraint(:user_id)
  end

  @doc false
  def github_changeset(profile, attrs) do
    profile
    |> cast(attrs, [:user_id, :github_username, :github_summary])
    |> validate_required([:user_id, :github_username])
    |> unique_constraint(:user_id)
  end

  @doc false
  def disconnect_github_changeset(profile) do
    change(profile, %{github_username: nil, github_summary: nil})
  end

  defp validate_url(changeset, field, domain_regex) do
    validate_change(changeset, field, fn ^field, value ->
      cond do
        value in [nil, ""] -> []
        not Regex.match?(@url_regex, value) -> [{field, "must be a valid http(s) URL"}]
        domain_regex && not Regex.match?(domain_regex, value) -> [{field, "doesn't look like the right kind of link"}]
        String.length(value) > 500 -> [{field, "is too long"}]
        true -> []
      end
    end)
  end
end
