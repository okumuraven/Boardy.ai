defmodule VokaziWeb.ChannelCase do
  @moduledoc """
  This module defines the test case to be used by channel tests.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      import Phoenix.ChannelTest
      import VokaziWeb.ChannelCase

      @endpoint VokaziWeb.Endpoint
    end
  end

  setup tags do
    Vokazi.DataCase.setup_sandbox(tags)
    :ok
  end
end
