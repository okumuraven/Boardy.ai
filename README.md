# Boardy.ai 🎙️ 🤝

Boardy.ai is an elite, voice-first Web3 professional matchmaking platform. 
Instead of filling out endless forms, users connect their wallet, press a button, and have a natural conversation with an AI agent (powered by Vapi.ai). The AI extracts what the user is building (their "Offer") and what they need (their "Need"), generates 1536-dimensional embeddings, and uses `pgvector` on an Elixir/Phoenix backend to instantly find their perfect co-founder, investor, or developer match.

## 🚀 Architecture
- **Frontend**: React + Vite + Tailwind CSS + Thirdweb (Wallet Auth) + Vapi Web SDK (Voice Agent)
- **Backend**: Elixir + Phoenix (REST API & Webhooks)
- **Database**: PostgreSQL with `pgvector` for Cosine Similarity Matching
- **Infrastructure**: Fully Dockerized (Monorepo)

## 🛠️ Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- Node.js (for local frontend development)
- A Thirdweb Client ID (for wallet connections)
- A Vapi.ai Public Key & Assistant ID (for the voice AI)

## ⚡ Quick Start (For Teams)

### 1. Environment Setup
Create a `.env` file in the `frontend/` directory with your keys:
```env
VITE_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
VITE_VAPI_ASSISTANT_ID=your_vapi_assistant_id
VITE_API_URL=http://localhost:4000
```

### 2. Boot the Infrastructure
Run the entire stack (Database, Elixir Backend, React Frontend) via Docker:
```bash
docker compose up --build
```

### 3. Access the DApp
Open your browser and navigate to: `http://localhost:5173`

- **Database**: Runs on `localhost:5432`
- **Backend API**: Runs on `localhost:4000`

## 🧠 How it Works
1. **Connect**: User authenticates seamlessly via Thirdweb wallet.
2. **Profile**: User sets their Name, Phone, and Role.
3. **Interview**: User clicks the Microphone and talks to "Boardy" (the Vapi AI Agent).
4. **Match**: The backend computes cosine similarity on the vector embeddings and pairs the user with their highest-synergy counterpart.

## 🤝 Contributing
Clone the repo, set up your `.env`, and ensure Docker is running. The Elixir backend uses `network_mode: "host"` to bypass Docker DNS issues and features blazing-fast hot-reloading.
