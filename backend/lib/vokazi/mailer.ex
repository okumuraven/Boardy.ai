defmodule Vokazi.Mailer do
  @moduledoc """
  Thin Resend REST API client shared by every transactional email in
  this app - a single `Req` call, matching the Req-based style already
  used for other external HTTP calls (`Vokazi.Auth.GoogleSignIn`,
  `Vokazi.SocialProfiles.GithubClient`) rather than pulling in Swoosh
  for a handful of transactional sends. Originally lived only inside
  `Vokazi.Admin.InviteMailer` - extracted here once a second caller
  needed the identical send logic.

  Without a verified sending domain on Resend, sandbox mode can only
  deliver to the email address the Resend account itself was created
  with - real sends to other addresses will fail until
  `RESEND_FROM_EMAIL` is on a verified domain (kuzana.co, post-hackathon).
  """

  require Logger

  @resend_url "https://api.resend.com/emails"

  @doc "Returns :ok once Resend accepts the send, {:error, :send_failed} otherwise."
  def deliver(to, subject, html) do
    body = %{from: from_address(), to: [to], subject: subject, html: html}

    case Req.post(@resend_url, json: body, auth: {:bearer, api_key()}, receive_timeout: 15_000) do
      {:ok, %Req.Response{status: status}} when status in 200..299 ->
        :ok

      {:ok, %Req.Response{status: status, body: resp_body}} ->
        Logger.error("Vokazi.Mailer: Resend rejected email status=#{status} body=#{inspect(resp_body)}")
        {:error, :send_failed}

      {:error, reason} ->
        Logger.error("Vokazi.Mailer: Resend request error: #{inspect(reason)}")
        {:error, :send_failed}
    end
  end

  defp api_key, do: System.fetch_env!("RESEND_API_KEY")
  defp from_address, do: System.get_env("RESEND_FROM_EMAIL") || "onboarding@resend.dev"
end
