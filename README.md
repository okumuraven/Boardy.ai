# Vokazi.ai 🎙️ 🤝

Vokazi is the Web3 evolution of professional matchmaking, built specifically for the Silicon Savannah. 

Instead of traditional forms or cold emails, Vokazi uses a **conversational onboarding flow** combined with a **Web3 Trust-Gate**. Users drop their phone number, authenticate via Google (which secretly provisions an Avalanche C-Chain wallet via Thirdweb), and complete a live voice interview with our AI agent (powered by Vapi). 

The AI (Google Gemini) extracts their "Needs" and "Offers", generates 1536-dimensional embeddings, and uses `pgvector` to find perfect matches. Both parties then review the AI's match score/reasoning and must mutually accept before a real on-chain commitment (0.01 AVAX each, staked from their own wallet on Avalanche Fuji) unlocks a live chat room — completely eliminating ghosting and spam.

## 🚀 Architecture
- **Frontend**: React + Vite + custom CSS ("ink and brass" design system) + Thirdweb (In-App Wallets via Google OAuth) + Vapi Web SDK
- **Backend**: Elixir + Phoenix (REST API, Webhooks & real-time Channels)
- **Database**: PostgreSQL with `pgvector` for bidirectional Cosine Similarity Matching
- **AI**: Google Gemini (`gemini-embedding-2` for vectors, `gemini-3.5-flash` for summarization & match validation)
- **Smart Contracts**: Avalanche Fuji Testnet — `VokaziMatchStaking.sol` (live), `VokaziMilestoneEscrow.sol` (deployed, not yet wired into the app)
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

### 2. Configure Vapi.ai Agent
For the AI Oracle to successfully extract "Offers" and "Needs", configure your Vapi Assistant:
1. **System Prompt**: Copy the contents of `vapi_system_prompt.txt` into the Assistant's System Prompt box.
2. **First Message**: Set to: *"Hey there, welcome to Vokazi. Tell me a bit about what you're currently building?"*
3. **Structured Data**: Go to the **Analysis** tab -> **Structured Data Extraction** and paste the JSON schema found in `vapi_schema.json`.

### 3. Boot the Infrastructure
Run the entire stack (Database, Elixir Backend, React Frontend) via Docker:
```bash
docker compose up --build
```

### 4. Access the DApp
Open your browser and navigate to: `http://localhost:5173`

- **Database**: Runs on `localhost:5432`
- **Backend API**: Runs on `localhost:4000`

## 🧠 How it Works
1. **Conversational Onboarding**: User inputs phone number in a chat UI.
2. **Invisible Wallet**: User signs in with Google, automatically provisioning a Thirdweb Avalanche wallet.
3. **Voice Interview**: User talks to the Vapi AI Agent in the browser to log their Needs/Offers.
4. **AI Match & Mutual Consent**: The backend finds a high-confidence vector match, Gemini validates and scores it, and both users independently review and accept (or decline with a reason) on the `MatchReview` screen.
5. **Trust-Gate & Staking**: Once both accept, the backend registers the match on `VokaziMatchStaking.sol` and each user stakes 0.01 AVAX from their own wallet. The backend verifies both stakes directly on-chain before unlocking a real-time chat room.

> Note: automatic calendar/meeting scheduling is on the roadmap but not yet built — see `ROADMAP.md`.

## 🤝 Contributing
Clone the repo, set up your `.env`, and ensure Docker is running. The Elixir backend uses `network_mode: "host"` to bypass Docker DNS issues and features blazing-fast hot-reloading. See `ROADMAP.md` for our 3-month scaling plan.
