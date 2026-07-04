# Vokazi.ai - React Frontend ⚛️

The Vokazi frontend is a modern, single-page Web3 application built with React, Vite, and Tailwind CSS. It is the core interface for our "Trust-Gate" matchmaking platform.

## ✨ Features
- **Conversational Onboarding UI**: A frictionless, chat-like interface for collecting initial user intent.
- **Thirdweb Invisible Wallets**: Users sign in seamlessly with Google, and an Avalanche C-Chain wallet is provisioned in the background automatically. Zero crypto jargon.
- **Vapi.ai Web SDK**: In-browser real-time voice streaming with the AI agent to extract business needs and offers instantly.
- **Avalanche Staking**: Integration to stake USDC micro-commitments to unlock matches.
- **Responsive UI**: Glassmorphism design system utilizing tailored Tailwind CSS tokens.

## 🛠️ Setup
1. Create a `.env` file based on your keys:
```env
VITE_THIRDWEB_CLIENT_ID=your_client_id
VITE_VAPI_PUBLIC_KEY=your_vapi_pk
VITE_VAPI_ASSISTANT_ID=your_assistant_id
VITE_API_URL=http://localhost:4000
VITE_CHAIN_ID=43113
VITE_MATCH_STAKING_ADDRESS=0x3e5E4D5FA56fa78F9665Bc36b8D08964Dc790eFA
VITE_MILESTONE_ESCROW_ADDRESS=0xb26Ef6c2fC70D831924622fa783b1cc800eb3F64
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

## 📂 Directory Structure
- `/src/components/` - Main React components (`Dashboard`, `ProfileSetup`, `LandingPage`).
- `/src/index.css` - Global Tailwind tokens and glassmorphism utilities.
