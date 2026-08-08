defmodule Vokazi.Repo.Migrations.AddOnWhatsappToProfiles do
  use Ecto.Migration

  # Nullable, not default-true/false: nil means "never tried" (the
  # WhatsApp reminder button is offered but untested), distinct from an
  # explicit false ("staff tried wa.me and WhatsApp itself reported this
  # number isn't registered - don't offer the button again"). Separate
  # from phone_confirmed, which only proves the number is real/reachable
  # by a normal call - a real number can still have no WhatsApp account.
  def change do
    alter table(:profiles) do
      add :on_whatsapp, :boolean
    end
  end
end
