# 🔔 AvaCloud Webhooks — Master Research Report
*Vokazi Trust-Gate Implementation Guide — Fuji Testnet*

---

## 1. What is AvaCloud?

**AvaCloud** is Ava Labs' managed blockchain infrastructure platform built on top of the **Glacier API** — Avalanche's official data indexing and eventing layer.

### Platform Components
| Component | Description |
|---|---|
| **No-Code L1 Launcher** | Deploy custom app-chains without running validators |
| **Managed Validators** | Automated node operations, upgrades, scaling |
| **Web3 Data API (Glacier)** | Indexed blockchain data, REST endpoints, **Webhooks** |
| **Interoperability** | Teleporter / ICM bridges to C-Chain and other L1s |
| **Wallet-as-a-Service** | Key management infrastructure |

> **SDK Note (2025):** The AvaCloud SDK has been renamed to **ChainKit SDK** (`@avalanche-sdk/chainkit`). Docs may reference both names. The REST API remains `glacier-api.avax.network`.

### Relationship to Avalanche C-Chain
The **Contract Chain (C-Chain)** is Avalanche's primary EVM-compatible smart contract chain. Chain ID `43114` (mainnet), `43113` (Fuji testnet). Glacier sits on top of it providing the indexing and webhook layer that Vokazi depends on.

---

## 2. What Are AvaCloud Webhooks?

Webhooks are **HTTP POST callbacks** that AvaCloud sends to your registered URL the instant a specific on-chain event occurs. Instead of your Phoenix backend constantly polling an RPC node, AvaCloud watches the chain *for you* and pushes the data.

### Webhooks vs. Polling

| Dimension | AvaCloud Webhooks | Polling (eth_getLogs) |
|---|---|---|
| **Trigger model** | Push (event-driven) | Pull (interval-based) |
| **Latency** | Near real-time (~2s on Avalanche) | Depends on poll interval |
| **Resource cost** | Zero wasted requests | Constant CU burn |
| **Reliability** | Built-in 48-hour retry window | You manage missed events |
| **Complexity** | Requires public HTTPS endpoint | Simpler loop, but fragile |
| **Best for** | **Production trust-gates** ✅ | Local testing only |

### Supported Networks

| Network | Chain ID |
|---|---|
| Avalanche C-Chain Mainnet | `43114` |
| **Avalanche Fuji Testnet** | **`43113`** ← Vokazi uses this |
| Custom Avalanche L1s | Varies |
| P-Chain / X-Chain | Validator staking events |

### Event Types Available

| `eventType` | What It Monitors |
|---|---|
| `address_activity` | All txs, ERC-20 transfers, NFTs, smart contract logs, internal txs |
| `validator_activity` | Validator set changes, staking/unstaking on P-Chain |

> **For Vokazi:** We use `address_activity` + `includeLogs: true` + `eventSignatures` filtered to our `Staked` event topic. No noise from other txs on the contract.

---

## 3. How AvaCloud Webhooks Work — Full Technical Flow

```
Vokazi Smart Contract          AvaCloud Glacier           Phoenix Backend
       │                              │                          │
 User stakes USDC                     │                          │
 → Tx confirmed on Fuji               │                          │
       │────── block mined ──────────►│                          │
       │                   AvaCloud sees Staked event            │
       │                   matches webhook subscription          │
       │                              │──── HTTP POST ──────────►│
       │                              │  (HMAC-signed payload)   │
       │                              │                  ① Verify x-signature
       │                              │                  ② Idempotency check
       │                              │                  ③ record_stake()
       │                              │                  ④ If both staked → unlock
       │                              │◄──── 200 OK ────────────│
```

---

### 3.1 Creating a Webhook (REST API)

**Endpoint:** `POST https://glacier-api.avax.network/v1/webhooks`

**Headers:**
```
Content-Type: application/json
x-glacier-api-key: <YOUR_AVACLOUD_API_KEY>
```

**Request Body (Vokazi-specific):**
```json
{
  "name": "Vokazi Staking Monitor",
  "description": "Detects Staked and MatchUnlocked events on VokaziMatchStaking (Fuji)",
  "url": "https://api.vokazi.ai/webhooks/avacloud",
  "chainId": "43113",
  "eventType": "address_activity",
  "includeInternalTxs": false,
  "includeLogs": true,
  "metadata": {
    "addresses": ["0x<YOUR_STAKING_CONTRACT_ADDRESS>"],
    "eventSignatures": [
      "0x<keccak256('Staked(bytes32,address,uint256)')>",
      "0x<keccak256('MatchUnlocked(bytes32)')>"
    ]
  }
}
```

> ⚠️ `includeLogs: true` is **NOT the default**. Without it, you receive the transaction wrapper but the `logs` array will be empty — you won't see any event data.

**Successful Response:**
```json
{
  "id": "6d1bd383-aa8d-47b5-b793-da6d8a115fde",
  "eventType": "address_activity",
  "chainId": "43113",
  "name": "Vokazi Staking Monitor",
  "url": "https://api.vokazi.ai/webhooks/avacloud",
  "status": "active",
  "createdAt": "2026-07-12T13:00:00Z"
}
```

---

### 3.2 Complete REST API Reference

| Method | Endpoint | Purpose | CU Cost |
|---|---|---|---|
| `POST` | `/v1/webhooks` | Create a webhook | 20 CU |
| `GET` | `/v1/webhooks` | List all webhooks | 10 CU |
| `GET` | `/v1/webhooks/{id}` | Get a specific webhook | 10 CU |
| `PATCH` | `/v1/webhooks/{id}` | Update webhook | 20 CU |
| `DELETE` | `/v1/webhooks/{id}` | Delete webhook | 10 CU |
| `GET` | `/v1/webhooks:getSharedSecret` | Get HMAC secret | 10 CU |
| `POST` | `/v1/webhooks:generateOrRotateSharedSecret` | Rotate HMAC secret | 20 CU |

**Base URL:** `https://glacier-api.avax.network`
**Auth Header:** `x-glacier-api-key: <YOUR_KEY>`

> Receiving webhooks costs **0 CUs** — AvaCloud pays the watch cost. Only management API calls consume your quota.

---

### 3.3 Full Webhook Payload Structure

When `Staked` fires, AvaCloud sends this `POST` to your endpoint:

**HTTP Headers (incoming from AvaCloud):**
```
POST /webhooks/avacloud HTTP/1.1
Content-Type: application/json
x-signature: <hmac_sha256_hex_of_raw_body>
```

**JSON Body:**
```json
{
  "webhookId": "6d1bd383-aa8d-47b5-b793-da6d8a115fde",
  "eventType": "address_activity",
  "messageId": "8e4e7284-852a-478b-b425-27631c8d22d2",
  "event": {
    "transaction": {
      "blockHash": "0x2a47bebed93db4a21cc8339980f004cc67f17d0dff4a368001e450e7be2edaa0",
      "blockNumber": "45396106",
      "blockTimestamp": 1736935200,
      "from": "0xUserWalletAddress",
      "to": "0xYOUR_STAKING_CONTRACT_ADDRESS",
      "gas": "80000",
      "gasPrice": "52000000000",
      "gasUsed": "42300",
      "value": "0",
      "hash": "0xabc123def456...",
      "nonce": "12",
      "transactionIndex": "3",
      "status": "1",
      "logs": [
        {
          "address": "0xYOUR_STAKING_CONTRACT_ADDRESS",
          "topics": [
            "0x<topic0: keccak256 of 'Staked(bytes32,address,uint256)'>",
            "0x<matchId: bytes32 indexed param>",
            "0x000000000000000000000000<user_address_padded_to_32_bytes>"
          ],
          "data": "0x<ABI-encoded uint256 amount — 32 bytes big-endian>",
          "logIndex": "0",
          "transactionIndex": "3",
          "transactionHash": "0xabc123def456...",
          "blockNumber": "45396106",
          "removed": false
        }
      ],
      "internalTransactions": []
    }
  }
}
```

**Key field guide:**
| Field | What to do with it |
|---|---|
| `messageId` | Store in DB as idempotency key — skip re-processing if seen before |
| `webhookId` | Identifies which subscription fired (useful for multi-webhook setups) |
| `event.transaction.status` | Must be `"1"` (success) — ignore reverted txs (`"0"`) |
| `event.transaction.from` | The user's wallet address who sent the stake tx |
| `event.transaction.logs[0].topics[0]` | The event topic hash — routes to correct handler |
| `event.transaction.logs[0].topics[1]` | `matchId` (bytes32 indexed param) |
| `event.transaction.logs[0].topics[2]` | `user` address (padded to 32 bytes — strip first 24 chars) |
| `event.transaction.logs[0].data` | `amount` as uint256 (first 32 bytes = 64 hex chars) |

---

### 3.4 HMAC-SHA256 Signature Verification

Every request from AvaCloud includes `x-signature` — an HMAC-SHA256 hex digest of the **raw request body** bytes signed with your **Shared Secret**.

**Getting your Shared Secret (one-time):**
```bash
curl https://glacier-api.avax.network/v1/webhooks:getSharedSecret \
  -H "x-glacier-api-key: YOUR_API_KEY"
# Response: { "secret": "abc123..." }
```

> ⚠️ The secret is **per-account**, not per-webhook. Rotating it invalidates ALL webhook signatures immediately.

**Verification Algorithm:**
```
HMAC-SHA256(key=sharedSecret, message=rawRequestBodyBytes)
→ hex-encode result (lowercase)
→ constant-time compare with x-signature header
```

The critical requirement: use the **raw, unmodified request body bytes** — not the parsed/re-serialized JSON. Any whitespace or key-order difference breaks the HMAC.

---

### 3.5 Delivery Guarantees & Retry Policy

| Property | Detail |
|---|---|
| **Guarantee** | **At-least-once** — duplicates possible |
| **Retry trigger** | Any non-2xx response, or connection timeout |
| **Retry strategy** | Exponential backoff |
| **Retry window** | **48 hours** from original event |
| **After 48 hours** | Event is dropped — backfill via `eth_getLogs` |
| **Idempotency required** | YES — use `messageId` as unique key |

---

### 3.6 Rate Limits (Compute Units)

| Plan | CU/min | CU/day |
|---|---|---|
| Free | 8,000 | 2,000,000 |
| Base | 12,000 | 8,000,000 |
| Growth | 16,000 | 15,000,000 |
| Pro | 20,000 | 25,000,000 |

---

## 4. Computing the Event Topic Hashes

Your Solidity contract emits:
```solidity
event Staked(bytes32 indexed matchId, address indexed user, uint256 amount);
event MatchUnlocked(bytes32 indexed matchId);
```

Compute topic hashes offline:
```bash
# Using Foundry
cast keccak "Staked(bytes32,address,uint256)"
cast keccak "MatchUnlocked(bytes32)"

# Using Node.js + ethers
node -e "const {ethers}=require('ethers'); console.log(ethers.id('Staked(bytes32,address,uint256)'))"
```

These hex strings go into the `eventSignatures` array when registering the webhook.

---

## 5. Full Elixir / Phoenix Implementation

### Step 1 — CacheBodyReader (Raw Body Preservation)

`lib/vokazi_web/plugs/cache_body_reader.ex`:
```elixir
defmodule VokaziWeb.Plugs.CacheBodyReader do
  @moduledoc """
  Caches raw request body bytes into conn.private[:raw_body]
  BEFORE Plug.Parsers decodes them. Required for AvaCloud HMAC verification.
  """
  def read_body(conn, opts) do
    {:ok, body, conn} = Plug.Conn.read_body(conn, opts)
    conn = Plug.Conn.put_private(conn, :raw_body, body)
    {:ok, body, conn}
  end
end
```

In `lib/vokazi_web/endpoint.ex` — update `Plug.Parsers`:
```elixir
plug Plug.Parsers,
  parsers: [:urlencoded, :multipart, :json],
  pass: ["*/*"],
  json_decoder: Phoenix.json_library(),
  body_reader: {VokaziWeb.Plugs.CacheBodyReader, :read_body, []}
  # ↑ This line is the critical addition
```

---

### Step 2 — Signature Verification Plug

`lib/vokazi_web/plugs/verify_avacloud_signature.ex`:
```elixir
defmodule VokaziWeb.Plugs.VerifyAvaCloudSignature do
  @moduledoc "Rejects AvaCloud webhooks with invalid HMAC-SHA256 signatures."
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    raw_body = conn.private[:raw_body]
    signature = get_req_header(conn, "x-signature") |> List.first()

    if valid_signature?(raw_body, signature) do
      conn
    else
      conn
      |> send_resp(401, "Invalid signature")
      |> halt()
    end
  end

  defp valid_signature?(body, sig) when is_binary(body) and is_binary(sig) do
    secret = System.get_env("AVACLOUD_WEBHOOK_SECRET")

    expected =
      :crypto.mac(:hmac, :sha256, secret, body)
      |> Base.encode16(case: :lower)

    Plug.Crypto.secure_compare(expected, sig)
  end

  defp valid_signature?(_, _), do: false
end
```

---

### Step 3 — AvaCloud Webhook Controller

`lib/vokazi_web/controllers/avacloud_webhook_controller.ex`:
```elixir
defmodule VokaziWeb.AvaCloudWebhookController do
  use VokaziWeb, :controller
  require Logger

  # Precompute these from: cast keccak "Staked(bytes32,address,uint256)"
  @staked_topic        "0x<FILL_IN_AFTER_COMPUTING>"
  # cast keccak "MatchUnlocked(bytes32)"
  @match_unlocked_topic "0x<FILL_IN_AFTER_COMPUTING>"

  @doc """
  AvaCloud POSTs here on every matching on-chain event.
  MUST return 200 quickly — heavy work is done async.
  """
  def receive(conn, _params) do
    raw_body = conn.private[:raw_body]

    case Jason.decode(raw_body) do
      {:ok, payload} ->
        # Acknowledge immediately, process in background
        Task.start(fn -> process_payload(payload) end)
        send_resp(conn, 200, "ok")

      {:error, reason} ->
        Logger.error("[AvaCloud] JSON parse error: #{inspect(reason)}")
        send_resp(conn, 400, "Bad Request")
    end
  end

  # ─── Payload Processing ─────────────────────────────────────────────────

  defp process_payload(payload) do
    message_id = payload["messageId"]

    if already_processed?(message_id) do
      Logger.info("[AvaCloud] Duplicate messageId #{message_id} — skipped")
    else
      mark_as_processed(message_id)

      payload
      |> get_in(["event", "transaction", "logs"])
      |> List.wrap()
      |> Enum.each(&route_log/1)
    end
  end

  defp route_log(%{"topics" => [topic0 | rest]} = log) do
    case topic0 do
      @staked_topic         -> handle_staked(log, rest)
      @match_unlocked_topic -> handle_match_unlocked(log, rest)
      other                 -> Logger.debug("[AvaCloud] Unhandled topic: #{other}")
    end
  end

  defp route_log(_), do: :ok

  # ─── Staked Event ────────────────────────────────────────────────────────

  defp handle_staked(_log, [match_id_hex, user_hex | _]) do
    match_id     = match_id_hex
    user_address = extract_address(user_hex)

    Logger.info("[AvaCloud] Staked — matchId=#{match_id} user=#{user_address}")

    case Vokazi.Matchmaking.record_stake(match_id, user_address) do
      {:ok, :both_staked, match} ->
        Logger.info("[AvaCloud] Both staked! Unlocking match #{match.id}")
        Vokazi.Matchmaking.unlock_match(match)
        VokaziWeb.Endpoint.broadcast("match:#{match.id}", "match_unlocked", %{match_id: match.id})

      {:ok, :awaiting_counterpart} ->
        Logger.info("[AvaCloud] First stake recorded — waiting for counterpart")

      {:error, reason} ->
        Logger.error("[AvaCloud] record_stake failed: #{inspect(reason)}")
    end
  end

  # ─── MatchUnlocked Event ────────────────────────────────────────────────

  defp handle_match_unlocked(_log, [match_id_hex | _]) do
    Logger.info("[AvaCloud] MatchUnlocked — matchId=#{match_id_hex}")
    Vokazi.Matchmaking.unlock_match_by_onchain_id(match_id_hex)
  end

  # ─── ABI Decoding Helpers ───────────────────────────────────────────────

  # Address topics are left-padded to 32 bytes:
  # "0x000000000000000000000000<20-byte-address>"
  defp extract_address("0x" <> padded) do
    "0x" <> String.slice(padded, -40, 40)
  end

  # uint256 amount is the first 32 bytes of log.data
  defp decode_uint256("0x" <> hex) do
    hex
    |> String.slice(0, 64)
    |> Integer.parse(16)
    |> elem(0)
  end

  # ─── Idempotency ────────────────────────────────────────────────────────

  defp already_processed?(message_id) do
    import Ecto.Query
    Vokazi.Repo.exists?(
      from w in Vokazi.Schema.ProcessedWebhook,
      where: w.message_id == ^message_id
    )
  end

  defp mark_as_processed(message_id) do
    %Vokazi.Schema.ProcessedWebhook{message_id: message_id}
    |> Vokazi.Repo.insert(on_conflict: :nothing)
  end
end
```

---

### Step 4 — Router

`lib/vokazi_web/router.ex`:
```elixir
# Webhook pipeline — no CSRF, no auth session
pipeline :webhooks do
  plug :accepts, ["json"]
  plug VokaziWeb.Plugs.VerifyAvaCloudSignature
end

scope "/webhooks", VokaziWeb do
  pipe_through :webhooks
  post "/avacloud", AvaCloudWebhookController, :receive
end
```

---

### Step 5 — Ecto Migration for Idempotency Table

```elixir
defmodule Vokazi.Repo.Migrations.CreateProcessedWebhooks do
  use Ecto.Migration

  def change do
    create table(:processed_webhooks) do
      add :message_id, :string, null: false
      timestamps(updated_at: false)
    end

    create unique_index(:processed_webhooks, [:message_id])
  end
end
```

Schema `lib/vokazi/schema/processed_webhook.ex`:
```elixir
defmodule Vokazi.Schema.ProcessedWebhook do
  use Ecto.Schema

  schema "processed_webhooks" do
    field :message_id, :string
    timestamps(updated_at: false)
  end
end
```

---

### Step 6 — AvaCloud REST Client (Registration)

`lib/vokazi/avacloud/client.ex`:
```elixir
defmodule Vokazi.AvaCloud.Client do
  @base_url "https://glacier-api.avax.network"

  def create_webhook(contract_address, callback_url, event_topics) do
    body = Jason.encode!(%{
      name: "Vokazi Staking Monitor",
      description: "Fires on Staked and MatchUnlocked events (Fuji testnet)",
      url: callback_url,
      chainId: "43113",
      eventType: "address_activity",
      includeInternalTxs: false,
      includeLogs: true,
      metadata: %{
        addresses: [contract_address],
        eventSignatures: event_topics
      }
    })

    post("/v1/webhooks", body)
  end

  def get_shared_secret do
    case get("/v1/webhooks:getSharedSecret") do
      {:ok, %{"secret" => secret}} -> {:ok, secret}
      error -> error
    end
  end

  def list_webhooks, do: get("/v1/webhooks")
  def delete_webhook(id), do: delete("/v1/webhooks/#{id}")

  # ─── Private HTTP helpers ──────────────────────────────────────────────

  defp post(path, body) do
    case HTTPoison.post(url(path), body, headers()) do
      {:ok, %{status_code: s, body: resp}} when s in 200..201 -> {:ok, Jason.decode!(resp)}
      {:ok, %{status_code: s, body: resp}} -> {:error, "HTTP #{s}: #{resp}"}
      {:error, reason} -> {:error, reason}
    end
  end

  defp get(path) do
    case HTTPoison.get(url(path), headers()) do
      {:ok, %{status_code: 200, body: body}} -> {:ok, Jason.decode!(body)}
      {:ok, %{status_code: s, body: body}} -> {:error, "HTTP #{s}: #{body}"}
      {:error, reason} -> {:error, reason}
    end
  end

  defp delete(path) do
    HTTPoison.delete(url(path), headers())
  end

  defp url(path), do: @base_url <> path
  defp headers do
    [
      {"Content-Type", "application/json"},
      {"x-glacier-api-key", System.get_env("AVACLOUD_API_KEY")}
    ]
  end
end
```

---

### Step 7 — Mix Task (One-Time Webhook Registration)

`lib/mix/tasks/vokazi.register_avacloud_webhook.ex`:
```elixir
defmodule Mix.Tasks.Vokazi.RegisterAvacloudWebhook do
  use Mix.Task
  @shortdoc "Registers Vokazi staking contract webhook with AvaCloud"

  def run(_) do
    Application.ensure_all_started(:httpoison)

    contract  = System.get_env("STAKING_CONTRACT_ADDRESS")
    url       = System.get_env("WEBHOOK_URL")
    staked    = System.get_env("STAKED_TOPIC")
    unlocked  = System.get_env("MATCH_UNLOCKED_TOPIC")

    IO.puts("Registering webhook for contract #{contract}...")

    case Vokazi.AvaCloud.Client.create_webhook(contract, url, [staked, unlocked]) do
      {:ok, webhook} ->
        IO.puts("✅ Webhook registered! ID: #{webhook["id"]}")
      {:error, reason} ->
        IO.puts("❌ Failed: #{inspect(reason)}")
    end
  end
end
```

Run it:
```bash
mix vokazi.register_avacloud_webhook
```

---

## 6. Environment Variables

```env
# AvaCloud
AVACLOUD_API_KEY=your_api_key_from_avacloud_dashboard
AVACLOUD_WEBHOOK_SECRET=your_secret_from_getSharedSecret

# Contract (Fuji Testnet)
STAKING_CONTRACT_ADDRESS=0x<deployed_contract_address>
STAKED_TOPIC=0x<cast keccak "Staked(bytes32,address,uint256)">
MATCH_UNLOCKED_TOPIC=0x<cast keccak "MatchUnlocked(bytes32)">

# Webhook (public URL — use ngrok for local dev)
WEBHOOK_URL=https://api.vokazi.ai/webhooks/avacloud
```

`config/runtime.exs`:
```elixir
config :vokazi, :avacloud,
  api_key:        System.get_env("AVACLOUD_API_KEY"),
  webhook_secret: System.get_env("AVACLOUD_WEBHOOK_SECRET")
```

---

## 7. Benefits for Vokazi's Trust-Gate

| Vokazi Need | AvaCloud Webhooks Solution |
|---|---|
| Know the instant both users have staked | Fires within ~2s of block confirmation |
| Only care about OUR contract's events | Filter by `addresses` + `eventSignatures` |
| No self-hosted node needed | AvaCloud watches the chain for you |
| Protect against spoofed POST attacks | HMAC-SHA256 `x-signature` on every delivery |
| Handle Phoenix downtime gracefully | 48-hour retry window with exponential backoff |
| Avoid double-processing a stake | `messageId` idempotency key in DB |
| Test locally without deploying | ngrok exposes localhost to AvaCloud |

---

## 8. Gotchas & Best Practices

### ⚠️ Critical Gotchas

| Gotcha | Fix |
|---|---|
| `includeLogs: true` is NOT default | Always set explicitly — without it, `logs[]` is empty |
| Raw body required for HMAC | Use `CacheBodyReader` BEFORE `Plug.Parsers` |
| Shared secret is account-wide | Rotating it breaks ALL webhooks immediately |
| At-least-once delivery | Implement `messageId` idempotency — mandatory |
| Fuji chain ID is a **string** `"43113"` | Not an integer `43113` |
| AvaCloud retries on any non-2xx | Return 200 fast, process async |
| Address case sensitivity | Always `String.downcase/1` before DB lookups |
| 48h window expires | Add startup backfill via `eth_getLogs` for gaps |

### ✅ Return 200 Immediately — Process Async

```elixir
# ✅ Correct
Task.start(fn -> process_payload(payload) end)
send_resp(conn, 200, "ok")

# ❌ Wrong — may timeout, AvaCloud will retry
process_payload(payload)   # slow DB + Calendar API calls
send_resp(conn, 200, "ok")
```

For production, use **Oban** instead of `Task.start` for guaranteed async processing with retries.

### 🛠️ Local Development with ngrok

```bash
# 1. Start Phoenix
mix phx.server   # port 4000

# 2. Expose with ngrok
ngrok http 4000
# → https://xxxx.ngrok-free.app/webhooks/avacloud

# 3. Inspect raw payloads at http://127.0.0.1:4040 (ngrok dashboard)

# 4. Re-register webhook with ngrok URL
mix vokazi.register_avacloud_webhook
```

Alternative tunnels: `cloudflared tunnel` (static URL, free), `localtunnel`, `tailscale funnel`

**Tip:** Point webhook at [webhook.site](https://webhook.site) first to capture the exact raw JSON before connecting to Phoenix.

---

## 9. Implementation Checklist

```
Phase 1 — Smart Contract
  ☐ Deploy VokaziMatchStaking to Fuji (43113)
  ☐ Note contract address
  ☐ Run: cast keccak "Staked(bytes32,address,uint256)"
  ☐ Run: cast keccak "MatchUnlocked(bytes32)"

Phase 2 — Phoenix Backend
  ☐ Create lib/vokazi_web/plugs/cache_body_reader.ex
  ☐ Update endpoint.ex Plug.Parsers with body_reader
  ☐ Create lib/vokazi_web/plugs/verify_avacloud_signature.ex
  ☐ Create lib/vokazi_web/controllers/avacloud_webhook_controller.ex
  ☐ Add :webhooks pipeline + POST route to router.ex
  ☐ Create processed_webhooks migration + schema
  ☐ Implement Matchmaking.record_stake/2 + unlock_match/1

Phase 3 — Registration & Testing
  ☐ Get API key from avacloud.io dashboard
  ☐ Get shared secret via GET /v1/webhooks:getSharedSecret
  ☐ Set all env vars
  ☐ Start ngrok for local testing
  ☐ Run: mix vokazi.register_avacloud_webhook
  ☐ Test: trigger a stake tx on Fuji → verify Phoenix receives it
  ☐ Verify idempotency: send same payload twice → only processed once
  ☐ Verify signature rejection: send wrong header → 401

Phase 4 — Production
  ☐ Deploy Phoenix with public URL
  ☐ Update webhook URL via PATCH /v1/webhooks/{id}
  ☐ Monitor via AvaCloud dashboard
  ☐ Add Oban job queue for reliable async processing
  ☐ Add startup backfill guard for missed events after downtime
```
