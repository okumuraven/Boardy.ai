defmodule Vokazi.Crypto do
  @moduledoc """
  AES-256-GCM encryption for secrets that must be stored at rest (Google
  Calendar OAuth access/refresh tokens) but never appear in plaintext in
  the database. Keyed off `SECRET_KEY_BASE` (already provisioned for
  Phoenix's own cookie/session signing) so this needs no extra secret -
  not a general-purpose crypto module, scoped to exactly this one need.
  """

  @aad "vokazi.scheduling"

  @doc """
  Encrypts `plaintext`, returning a single opaque base64 string (random
  96-bit IV + 128-bit auth tag + ciphertext, packed together) safe to
  store directly in a `:string` column.
  """
  def encrypt(plaintext) when is_binary(plaintext) do
    iv = :crypto.strong_rand_bytes(12)
    {ciphertext, tag} = :crypto.crypto_one_time_aead(:aes_256_gcm, key(), iv, plaintext, @aad, true)
    Base.encode64(iv <> tag <> ciphertext)
  end

  @doc """
  Reverses `encrypt/1`. Raises on tampered/corrupt input (auth tag
  mismatch) rather than silently returning garbage.
  """
  def decrypt(encoded) when is_binary(encoded) do
    <<iv::binary-size(12), tag::binary-size(16), ciphertext::binary>> = Base.decode64!(encoded)

    case :crypto.crypto_one_time_aead(:aes_256_gcm, key(), iv, ciphertext, @aad, tag, false) do
      plaintext when is_binary(plaintext) -> plaintext
      :error -> raise "Vokazi.Crypto: failed to decrypt - ciphertext may be corrupt or tampered"
    end
  end

  defp key do
    :vokazi
    |> Application.fetch_env!(VokaziWeb.Endpoint)
    |> Keyword.fetch!(:secret_key_base)
    |> then(&:crypto.hash(:sha256, &1))
  end
end
