# Hosting Architecture Comparison: Single VPS vs. Split Managed Services

> **Update, 2026-07-24:** confirmed with the team — there is still no production deployment; the
> app runs purely via local `docker compose` today. This doc's core recommendation (frontend +
> backend + database as one co-located unit, for the reasons in §4) still stands and now also
> covers the planned in-app calling feature's `coturn` (TURN relay) service — but `coturn` should
> run as its **own separate, standalone service**, not co-located with the app. It has no tight
> coupling to Postgres, needs a wide open UDP port range and real bandwidth for relayed call media,
> and mixing that workload onto the same small box as the latency-sensitive Phoenix/DB app risks a
> call surge competing with webhook/WebSocket traffic that has to stay responsive. This holds
> regardless of which provider ends up hosting the main app - see `call_feature.md` §4 and
> `ROADMAP.md` Phase 6.
>
> **Open, not yet decided:** this doc recommends AWS EC2 specifically (compared only against
> Vercel+Render+Neon); the root `CLAUDE.md` states Fly.io as the standard platform default. These
> were never reconciled against each other, and since nothing is deployed yet, that choice should
> be made deliberately when it's actually time to deploy, not assumed from either document.

When launching an MVP for users to test, deciding between a single Virtual Private Server (AWS EC2) and a split "managed" stack (Vercel + Render + Neon) is one of the most critical decisions. 

We must evaluate this specifically against **Vokazi's unique requirements:** Elixir/Phoenix, real-time WebSockets (Chat), `pgvector` database queries, and instant Voice AI webhooks.

---

## 1. The Split Stack: Vercel (React) + Render (Elixir) + Neon (Postgres)

This is a very popular "modern" approach where you use managed services that automatically deploy when you push to GitHub.

### **The Good (Pros)**
*   **Zero Configuration:** You don't have to manage Linux, install dependencies, or configure SSL certificates. It's plug-and-play.
*   **Vercel Speed:** Vercel puts your React frontend on a global CDN. It will load incredibly fast for users anywhere in the world.
*   **No Surprise Bills:** Free tiers on these platforms are "hard-capped". If you exceed limits, the app simply stops working until next month rather than charging your credit card.
*   **Neon pgvector Support:** Neon natively supports the `pgvector` extension, which is critical for Vokazi's AI matching.

### **The Bad (Cons & Dealbreakers for Vokazi)**
*   **The "Cold Start" Problem (Major Issue):** Render's free tier automatically puts your backend to "sleep" after 15 minutes of inactivity. When a user visits the app, it takes **30 to 60 seconds** for the backend to wake up. 
    * *Why this kills Vokazi:* If a user does a Voice AI interview, Vapi will send a webhook to your backend. If Render is asleep, that webhook will time out, and you will lose the user's data completely.
*   **Network Latency:** Your backend (Render) and your database (Neon) are in different physical data centers. Every database query has to travel across the public internet. This makes AI vector searches and chat queries noticeably slower.
*   **WebSocket Limitations:** Phoenix Channels (used for Vokazi's real-time chat) require persistent, long-lived connections. Free tier managed services often forcefully drop WebSocket connections to save resources.

---

## 2. The Single Server Stack: AWS EC2 Free Tier (VPS)

In this approach, you rent a single "blank canvas" Linux server (1GB RAM) and run your Database, Backend, and Frontend all on the same machine using Docker Compose.

### **The Good (Pros)**
*   **Zero Latency Data:** Because your Elixir Backend and PostgreSQL Database are running on the exact same motherboard, latency between them is `0.1ms`. Vector math and matching will be blazing fast.
*   **No Sleep Mode:** An AWS EC2 instance runs 24/7. Your webhook endpoints are always awake and ready to catch Vapi calls instantly.
*   **Perfect for WebSockets:** You control the network layer. Phoenix Channels will remain persistently open without aggressive load balancers dropping the connection.
*   **True to Local Environment:** You can just run `docker compose up -d` exactly like you do on your laptop.

### **The Bad (Cons)**
*   **Setup Complexity:** You are responsible for everything. You must install Docker, configure Nginx as a reverse proxy, set up a Swap file (because 1GB RAM is tiny), and provision SSL certificates via Let's Encrypt.
*   **Surprise Bill Risk:** If you leave it running past your 6-month trial, or accidentally launch two instances, AWS will charge your card.
*   **Frontend Speed:** The frontend is served directly from the AWS region (e.g., London or US East) rather than a global CDN. It will be slightly slower to load the initial React files for users far away from that region.

---

## 3. Direct Comparison Matrix

| Feature | Split Stack (Vercel + Render + Neon) | Single VPS (AWS EC2) |
| :--- | :--- | :--- |
| **Setup Difficulty** | Very Easy | Hard (Requires Linux knowledge) |
| **Frontend Speed** | Blazing Fast (Global CDN) | Good (Dependent on region) |
| **Backend Latency** | High (DB and Backend separated) | **Zero (Localhost)** |
| **Reliability (Webhooks)** | Very Poor (Sleeps after 15 mins) | **Excellent (Always awake)** |
| **Real-time WebSockets**| Unreliable on Free Tier | **Perfect** |
| **Billing Risk** | None | Medium (Must monitor limits) |

---

## 4. Final Recommendation for Vokazi

**You should choose the AWS Free Tier VPS.**

While Vercel + Render is easier to set up initially, **Render's sleep mode is a fatal flaw for a Voice AI application.** If the Vapi AI finishes a call and tries to send the transcript to a sleeping Render backend, the data will be lost, and the user's match will fail. 

Furthermore, because Vokazi relies heavily on real-time features (Phoenix Channels for chat) and heavy database queries (pgvector), having the backend and database on the exact same machine (AWS EC2) will provide a significantly better, more professional user experience. 

*Note: Since you already have a `docker-compose.yml` file in your repository, deploying to a single AWS VPS is actually just a matter of installing Docker on the server and pulling your code.*
