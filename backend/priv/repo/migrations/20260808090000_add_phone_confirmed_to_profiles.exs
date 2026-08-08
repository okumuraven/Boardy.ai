defmodule Vokazi.Repo.Migrations.AddPhoneConfirmedToProfiles do
  use Ecto.Migration

  # Tracks whether a human on staff has actually reached this member on
  # the stored phone_number - not whether the number is well-formed
  # (that's changeset validation), but whether it's real. Set only via
  # the admin panel (Vokazi.Admin.Members.confirm_phone/3), the moment a
  # manual outreach call actually connects. Lets any future automated
  # channel (WhatsApp deep links, SMS) skip numbers no one has ever
  # verified are reachable, instead of firing blind at guessed digits.
  def change do
    alter table(:profiles) do
      add :phone_confirmed, :boolean, default: false, null: false
    end
  end
end
