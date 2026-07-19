defmodule Vokazi.Scheduling.EncryptedField do
  @moduledoc """
  An Ecto type that transparently encrypts (`Vokazi.Crypto`) on the way
  into the database and decrypts on the way out, so schema/context code
  just reads and writes plain strings - the encryption is invisible
  everywhere except this module and the raw DB row.
  """
  use Ecto.Type

  def type, do: :string

  def cast(value) when is_binary(value), do: {:ok, value}
  def cast(_), do: :error

  def dump(nil), do: {:ok, nil}
  def dump(value) when is_binary(value), do: {:ok, Vokazi.Crypto.encrypt(value)}
  def dump(_), do: :error

  def load(nil), do: {:ok, nil}
  def load(value) when is_binary(value), do: {:ok, Vokazi.Crypto.decrypt(value)}

  def equal?(a, b), do: a == b
end
