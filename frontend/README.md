# Boardy.ai - React Frontend ⚛️

The Boardy.ai frontend is a modern, single-page Web3 application built with React, Vite, and Tailwind CSS. It integrates Thirdweb for wallet authentication and Vapi.ai for real-time voice AI interviews.

## ✨ Features
- **Thirdweb Integration**: Seamless Web3 login.
- **Vapi.ai Web SDK**: In-browser real-time voice streaming with the AI agent.
- **Responsive UI**: Glassmorphism design system using Tailwind CSS.

## 🛠️ Setup
1. Create a `.env` file based on your keys:
```env
VITE_THIRDWEB_CLIENT_ID=your_client_id
VITE_VAPI_PUBLIC_KEY=your_vapi_pk
VITE_VAPI_ASSISTANT_ID=your_assistant_id
VITE_API_URL=http://localhost:4000
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
