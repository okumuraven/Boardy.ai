# Boardy.ai - Elixir Phoenix Backend 💧

The Boardy.ai backend is a highly concurrent REST API built with Elixir and the Phoenix Framework. It handles user profiles, Vapi.ai webhook processing, and vector similarity matching using `pgvector`.

## 🏗️ Architecture
- **Elixir 1.15 / Erlang OTP**
- **Phoenix 1.8**
- **Ecto** (Database Wrapper)
- **Bandit** (Web Server)

## ⚡ Getting Started
The backend is designed to run automatically via Docker Compose from the root directory.

However, to run it natively without Docker:
```bash
# Install dependencies
mix deps.get

# Setup the database
mix ecto.setup

# Start the Phoenix server
mix phx.server
```

## 📡 API Endpoints
- `GET /api/profiles/:wallet_address` - Fetches a user profile.
- `POST /api/profiles` - Creates or updates a user profile.

*(Note: AI Webhook endpoint coming soon to receive Vapi analysis).*
