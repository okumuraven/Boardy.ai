defmodule Boardy.Matchmaking.Matcher do
  import Ecto.Query
  alias Boardy.Repo
  alias Boardy.Accounts.Profile

  @similarity_threshold 0.85 # 85% match required

  @doc """
  Finds the best matching profile where User A's Need matches User B's Offer.
  Uses pgvector cosine distance (<=>). Note: cosine distance = 1 - cosine similarity.
  """
  def find_best_match(user_need_vector, current_user_id) do
    # pgvector orders by distance ascending (closest first)
    query =
      from p in Profile,
      where: p.user_id != ^current_user_id,
      # 1 - distance = similarity. We want similarity >= threshold (distance <= 1 - threshold)
      where: fragment("? <=> ?", p.offer_vector, ^user_need_vector) <= (1.0 - ^@similarity_threshold),
      order_by: [asc: fragment("? <=> ?", p.offer_vector, ^user_need_vector)],
      limit: 1

    Repo.one(query)
  end
end
