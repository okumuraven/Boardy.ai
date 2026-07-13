defmodule VokaziWeb.Presence do
  @moduledoc """
  Tracks who's actually online in a chat room, via Phoenix's built-in
  Presence (CRDT-based, survives node restarts/reconnects correctly,
  scales to multiple nodes without extra work if this app ever runs on
  more than one) - not the empty stub the channel used to push.
  """

  use Phoenix.Presence,
    otp_app: :vokazi,
    pubsub_server: Vokazi.PubSub
end
