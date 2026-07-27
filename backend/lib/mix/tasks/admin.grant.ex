defmodule Mix.Tasks.Admin.Grant do
  @moduledoc """
  The ONLY way anyone ever becomes the very first Superadmin - run once, by
  whoever has direct deploy/database access, to bootstrap Kuzana's first
  admin account. Every admin after that is invited entirely through the
  admin panel itself (`Vokazi.Admin.Accounts.invite/3`, once built) - this
  task should never be needed again after at least one Superadmin exists.

  The target email must have already signed in to Kuzana Connect with
  Google at least once (so a real, Google-verified `User` row exists) -
  this task never creates a bare account itself, it only promotes an
  existing one. If nobody's signed in yet with that email, have them sign
  in first, then re-run this command.

      mix admin.grant kyle@kuzana.co --role superadmin
      mix admin.grant felicity@kuzana.co --role moderator
  """
  use Mix.Task
  import Ecto.Query

  alias Vokazi.Repo
  alias Vokazi.Accounts.User

  @shortdoc "Bootstraps an admin account for an existing user, by email"
  @admin_roles ["superadmin", "moderator", "support"]

  def run(args) do
    Mix.Task.run("app.start")

    {opts, positional, _invalid} = OptionParser.parse(args, strict: [role: :string])
    email = List.first(positional)
    role = opts[:role]

    cond do
      is_nil(email) ->
        Mix.shell().error("Usage: mix admin.grant <email> --role <superadmin|moderator|support>")

      role not in @admin_roles ->
        Mix.shell().error("--role must be one of: #{Enum.join(@admin_roles, ", ")}")

      true ->
        grant(email, role)
    end
  end

  defp grant(email, role) do
    case Repo.one(from u in User, where: u.email == ^email) do
      nil ->
        Mix.shell().error(
          "No account found for #{email} - they need to sign in to Kuzana Connect with " <>
            "Google at least once first, then re-run this command."
        )

      user ->
        user
        |> User.admin_changeset(%{admin_role: role, admin_status: "active"})
        |> Repo.update()
        |> case do
          {:ok, updated} ->
            Mix.shell().info("#{updated.email} (user_id=#{updated.id}) is now #{role}.")

          {:error, changeset} ->
            Mix.shell().error("Couldn't grant admin: #{inspect(changeset.errors)}")
        end
    end
  end
end
