defmodule Vokazi.PersonalEvents do
  @moduledoc """
  A user's own agenda items - not tied to any match, never shared with
  anyone else. Exists for two reasons: so the Calendar tab can show a
  single unified agenda instead of only Vokazi-scheduled calls, and so
  `Vokazi.Scheduling.MyFreeDays` can treat these as busy time when
  assembling free-day suggestions for a *new* match, the same way it
  already treats Google Calendar busy blocks.
  """

  import Ecto.Query, warn: false
  alias Vokazi.Repo
  alias Vokazi.PersonalEvents.PersonalEvent

  @doc "Creates a personal event owned by `user_id`."
  def create(user_id, attrs) do
    %PersonalEvent{}
    |> PersonalEvent.changeset(Map.put(attrs, "user_id", user_id))
    |> Repo.insert()
  end

  @doc "This user's upcoming personal events (today forward), earliest first."
  def list_for_user(user_id) do
    today = Date.utc_today()

    PersonalEvent
    |> where([e], e.user_id == ^user_id and e.date >= ^today)
    |> order_by([e], asc: e.date, asc: e.start_time)
    |> Repo.all()
  end

  @doc """
  Deletes a personal event, but only if `user_id` actually owns it -
  returns `{:error, :not_found}` for anyone else's id rather than
  leaking whether it exists.
  """
  def delete(id, user_id) do
    case Repo.get_by(PersonalEvent, id: id, user_id: user_id) do
      nil -> {:error, :not_found}
      event -> Repo.delete(event)
    end
  end
end
