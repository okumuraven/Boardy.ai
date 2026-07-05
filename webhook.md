# ⚡ Vokazi Webhook Architecture (Phase 1)

This document outlines the **4-Pillar Enterprise Webhook Architecture** for the `/api/vapi` endpoint. This ensures our backend is secure, resilient, and ready to scale to thousands of concurrent AI voice interviews.

---

### 1. 🛡️ Security & Verification (No Fake Data)
Right now, anyone who knows our API URL could send a fake POST request with fake "Offer" and "Need" data, poisoning our database.
**The Professional Fix:** Vapi allows us to set a **Webhook Secret**. Our Elixir endpoint must check the `x-vapi-secret` header. If the secret doesn't match, we instantly drop the request with a `401 Unauthorized`.

### 2. 🔗 Identity Resolution (Who just called?)
Because we had to remove `variableValues` from the frontend to fix the crash, Vapi currently has no idea *who* is talking. When the webhook hits our server, it will just say "Call Ended", but we won't know which User Profile to update.
**The Professional Fix:** When starting the call in `Dashboard.jsx`, we will pass the user's wallet address into Vapi's `metadata` object instead. Metadata is silently attached to the call and passed back in the webhook payload via `message.call.metadata.wallet_address`, allowing Elixir to safely find the user.

### 3. 🛡️ Graceful AI Fallbacks (Never lose data)
AI extraction is not 100% perfect. Sometimes the Vapi Assistant will fail to populate `professional_need` or `professional_offer` in the Structured Data JSON.
**The Professional Fix:** Our Elixir controller must use "defensive programming". If the structured data is missing, we must gracefully fall back to saving the `raw_transcript` into the database. This ensures we *never* lose an interview, and we can always manually parse it later.

### 4. ⚡ Asynchronous Processing (Fast Acknowledgement)
Vapi expects the webhook to return a `200 OK` within seconds. If we try to generate OpenAI embeddings while the webhook is open, it might timeout, causing Vapi to retry and duplicate the data.
**The Professional Fix:** Elixir is famous for its concurrency. The webhook should immediately update the database with the text and return `200 OK` to Vapi in milliseconds. It will then spin up an isolated background `Task` to handle the heavy vector math without blocking the connection.
