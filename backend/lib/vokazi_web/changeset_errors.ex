defmodule VokaziWeb.ChangesetErrors do
  @moduledoc """
  Shared changeset-error-to-JSON formatting, extracted after the same
  `to_string(value)` interpolation was copy-pasted across five
  controllers and crashed on `validate_inclusion`'s `enum:` option
  whenever it's a Range (e.g. `1..5`) rather than a list - Ranges don't
  implement `String.Chars`. `inspect/1` handles any value safely instead.
  """

  @doc "Formats an invalid changeset's errors into a plain %{field => [messages]} map, safe for any error interpolation value."
  def format(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", inspect(value))
      end)
    end)
  end
end
