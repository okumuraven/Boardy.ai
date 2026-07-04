# Vokazi - Elixir Phoenix Backend 💧

The Vokazi backend is a highly concurrent REST API built with Elixir and the Phoenix Framework. It handles user profiles, Vapi.ai webhook processing, and vector similarity matching using `pgvector`. It acts as the central nervous system connecting our AI data extraction with our Web3 Avalanche staking system.

## 🏗️ Architecture
- **Elixir 1.15 / Erlang OTP**
- **Phoenix 1.8**
- **Ecto** (Database Wrapper)
- **PostgreSQL + pgvector** (For high-dimensional Cosine Similarity math)

## ⚡ Getting Started
The backend is designed to run automatically via Docker Compose from the root directory.

However, to run it natively without Docker:
```bash
# Install dependencies
mix deps.get

# Setup the database (creates vokazi_dev)
mix ecto.setup

# Start the Phoenix server
mix phx.server
```

## 📡 API Endpoints & Webhooks
- `GET /api/profiles/:wallet_address` - Fetches a user profile.
- `POST /api/profiles` - Creates or updates a user profile.
- `POST /api/vapi_webhook` - Receives Vapi analysis, computes OpenAI vector similarities, and determines the best match ($\ge 0.85$).

## 🔗 Smart Contract Integration
The backend serves as the authoritative matchmaker for the `VokaziMatchStaking` contract. Once a high-synergy match is found via `pgvector`, the backend signals the frontend to prompt for a USDC stake on Avalanche Fuji. After both parties stake, the backend automatically schedules an Escrow-Gated Google Meeting.
