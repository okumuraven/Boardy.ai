# Boardy.ai 🤖🤝

**The Silicon Savannah's Premier NLP-Driven Matchmaking Engine**

Built for the Hackathon Bounty: *Bounty 3 — Boardy.ai for Kuzana*. Boardy.ai is an intelligent orchestration layer that uses Voice AI, pgvector embeddings, and Avalanche Web3 staking to connect entrepreneurs based on their specific business bottlenecks and resources.

## 📖 Project Documentation
- **[Architecture Deep-Dive](./ARCHITECTURE.md)**: Read this first to understand the 4-phase technical pipeline (Ingestion, Orchestration, Web3 Commitment, Engagement).

## 🚀 Tech Stack
- **Frontend:** React.js, Vite, Vanilla CSS (Glassmorphism)
- **Web3 Integration:** Thirdweb React SDK (`thirdweb`), Avalanche Fuji Testnet
- **Backend Orchestration:** n8n (Node-based workflow automation)
- **Database:** PostgreSQL 15 + `pgvector` extension (Dockerized)
- **Messaging:** Telegram Bot API (MVP) -> targeting WhatsApp via Whapi.cloud

---

## 🛠️ Local Development Setup

Follow these steps to get the entire project running on your local machine.

### 1. Database Setup (PostgreSQL + pgvector)
You must have Docker installed. Spin up a local PostgreSQL instance with pgvector support:

```bash
docker run -d \
  --name boardy_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=Jose254 \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  postgres:15
```

Once running, access the database and enable the vector extension, then create the tables:
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, 
    phone_number VARCHAR(20) UNIQUE, 
    wallet_address VARCHAR(42), 
    need_text TEXT, 
    offer_text TEXT, 
    need_vector VECTOR(1536), 
    offer_vector VECTOR(1536), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
*(Note: Ensure the `phone_number` column has a `UNIQUE` constraint so n8n can use `UPSERT` logic).*

### 2. Backend Orchestration (n8n)
1. Launch your n8n instance (Cloud or Local).
2. Create a new Workflow.
3. Add a **Webhook Node** listening to `POST /webhook-test/vapi-demo`.
4. Connect it to a **PostgreSQL Node**:
   - **Operation:** `Upsert`
   - **Table:** `users`
   - **Columns to match on:** `phone_number`
   - Map your incoming JSON fields (`{{$json.phone}}`, `{{$json.need}}`, `{{$json.offer}}`) to the database columns.
5. Connect it to a **Telegram Node**:
   - Configure your bot credentials via BotFather.
   - Set the Chat ID.
   - Message: `"Great news! We found a founder match for you! To unlock this connection, please deposit a 0.50 USDC stake on Avalanche."`
6. Keep the workflow Active or click **Execute Workflow** to listen for events.

### 3. Frontend Setup (React + Vite)
The frontend requires Node.js installed. It uses the modern Vite bundler and proxies requests to your local n8n instance to bypass CORS.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies (including thirdweb SDK)
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`. 
*(Check `vite.config.js` to ensure the proxy target port matches your local n8n port, usually `5678`).*

---

## 🎮 How to Demo the Project

To demonstrate the "Double Opt-In" matching logic during a pitch:

1. Open `http://localhost:5173`.
2. **Simulate User A (Founder):** Select "I am a Founder" from the dropdown. Enter a phone number. Click **Register & Receive AI Call**.
3. *Watch the backend:* n8n catches the webhook, upserts to Postgres, and fires the Telegram message.
4. **Simulate User B (Developer):** Refresh the page. Select "I am a Developer". Enter a different phone number. Click **Register**.
5. *The Match:* Because User A's need matches User B's offer, the `pgvector` similarity threshold (>0.82) is crossed, triggering the Telegram introduction alert.
6. **The Web3 Stake:** On the frontend, click the **Thirdweb Connect Button**, select your Core Wallet, and simulate the Avalanche Fuji USDC staking transaction.

---

## 🤝 Contributing
For team members looking to extend the MVP:
1. **Implement real embeddings:** Add an OpenAI node in n8n right after the webhook to generate real `VECTOR(1536)` coordinates instead of `[null]`.
2. **On-chain listener:** Build an AvaCloud Webhook to listen to the USDC smart contract and automatically trigger the final WhatsApp group creation in n8n.
