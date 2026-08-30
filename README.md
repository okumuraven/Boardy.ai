# Kuzana Connect 🎙️🤝

> 🚀 **Important Note:** Please read our **[Web 2.5 Roadmap & Monetization Strategy](./ROADMAP.md)**! It details our strategy for leveraging our current Web2 growth to transition into a decentralized, Avalanche-powered monetization ecosystem (Trust-Gates, Premium Tiers, and Milestone Escrows).

Kuzana Connect is an AI-driven member-discovery and matchmaking tool built specifically for
Kuzana's own community of founders, investors, operators, lenders, and consultants.

Instead of relying on WhatsApp posts and chance encounters, members complete a **conversational
onboarding flow**: sign in with Google (no separate account, no password), then do a live voice
interview with our AI agent (powered by Vapi) that extracts what they're offering and what they
need, in their own words.

The AI (Google Gemini) turns that transcript into vector embeddings and uses `pgvector` to find
genuinely complementary matches. Both members review the AI's match score and reasoning and must
independently accept before anything unlocks — the moment both say yes, a real-time chat room
opens and a mutual scheduling flow finds a call time that works for both sides.

> **Note on Web 2.5 Architecture:** While our immediate focus is on frictionless Web2 onboarding and growth, our future monetization and premium engagement phases are designed around **Avalanche**. We have already designed and tested a Web3 "Trust-Gate" on the Avalanche Fuji Testnet, and we plan to reintroduce Avalanche smart contracts for premium direct-contact tiers, investor deal-flow subscriptions, and automated milestone-escrow payouts as the platform matures. See `ROADMAP.md` for our full Web 2.5 monetization strategy.

## 🚀 Architecture
- **Frontend**: React + Vite + custom CSS (Kuzana Connect design system — Space Grotesk / Inter,
  Kuzana's brand palette) + Thirdweb (Google sign-in only, for identity) + Vapi Web SDK
- **Backend**: Elixir + Phoenix (REST API, Webhooks & real-time Channels)
- **Database**: PostgreSQL with `pgvector` for bidirectional cosine-similarity matching
- **AI**: Google Gemini (`gemini-embedding-2` for vectors, Gemini for summarization & match
  validation)
- **Infrastructure**: Fully Dockerized (monorepo)

## 🛠️ Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- Node.js (for local frontend development)
- A Thirdweb Client ID (for Google sign-in)
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
For the AI agent to successfully extract "Offers" and "Needs," configure your Vapi Assistant:
1. **System Prompt**: Copy the contents of `vapi_system_prompt.txt` into the Assistant's System
   Prompt box.
2. **First Message**: Set to something like: *"Hey there, welcome to Kuzana Connect. Tell me a bit
   about what you're currently building?"*
3. **Structured Data**: Go to the **Analysis** tab -> **Structured Data Extraction** and paste the
   JSON schema found in `vapi_schema.json`.

### 3. Boot the Infrastructure
Run the entire stack (Database, Elixir Backend, React Frontend) via Docker:
```bash
docker compose up --build
```

### 4. Access the App
Open your browser and navigate to: `http://localhost:5173`

- **Database**: Runs on `localhost:5432`
- **Backend API**: Runs on `localhost:4000`

## 🧠 How It Works
1. **Conversational Onboarding**: User enters their phone number in a chat-style UI.
2. **Google Sign-In**: User signs in with Google via Thirdweb — identity only, no wallet is
   provisioned or required.
3. **Voice Interview**: User talks to the Vapi AI agent in the browser to log their Needs/Offers.
4. **AI Match & Mutual Consent**: The backend finds a high-confidence vector match, Gemini
   validates and scores it, and both users independently review and accept (or decline with a
   reason) on the `MatchReview` screen.
5. **Unlock & Schedule**: The moment both sides accept, a real-time chat room opens. Each side
   independently curates their real free days on a calendar day-picker; once both submit, the
   backend intersects their windows and books the call automatically. See `calendar.md`.

Kuzana's own July 2026 member interviews (see `kuzana_connect_discovery.md`) validated this shape
directly and surfaced what's still missing for a version Kuzana would deploy internally — a
searchable member directory, industry categorization, and a distinct investor/lender profile view.
See `ROADMAP.md` for how that's being scoped in, and `PITCHING.md` for the business case.

## 🤝 Contributing
Clone the repo, set up your `.env`, and ensure Docker is running. The Elixir backend uses
`network_mode: "host"` to bypass Docker DNS issues and features blazing-fast hot-reloading. See
`ROADMAP.md` for the full engineering and growth plan.
