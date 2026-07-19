# Omnichannel Notification Engine Research & Strategy

## 1. Executive Summary
According to Phase 3 of the Vokazi Roadmap, the platform requires a robust Notification Engine to drive user retention. Because Vokazi relies on time-sensitive, high-value events (e.g., "You have a new AI Match" or "User B accepted your match"), we must ensure users are alerted promptly. 

To achieve this professionally, we will build a unified, **Omnichannel Notification System** in Elixir/Phoenix that routes alerts across three channels:
1. **In-App (System):** Real-time alerts when the user is currently online.
2. **Email:** Reliable, professional fallbacks for offline users.
3. **WhatsApp:** High-urgency mobile pushes to instantly drive users back to the Web3 Trust-Gate.

---

## 2. Architectural Design: The Elixir "Notification Hub"

A professional notification system doesn't scatter API calls throughout the codebase. Instead, it uses a centralized "Hub" pattern.

### How it works:
1. **Trigger:** An event happens in the system (e.g., `Matchmaking.create_match/1`).
2. **Event Bus:** The backend broadcasts an internal event (e.g., using Elixir's `Phoenix.PubSub` or `Oban` background jobs).
3. **The Router:** The central Notification Engine intercepts this event, checks the user's **Notification Preferences**, and decides *which* channels to route the message to.
4. **Delivery Workers:** Asynchronous background jobs deliver the message via the specific channel APIs.

> **Why Oban?** Sending emails and WhatsApp messages involves external network requests that can fail. By using **Oban** (a robust background job processor for PostgreSQL in Elixir), we guarantee reliable retries and prevent API latency from slowing down the user's web request.

---

## 3. Channel Implementation Details

### A. In-App Notifications (Real-Time)
*   **Technology:** Phoenix Channels (WebSockets) + React state.
*   **Mechanism:** When a notification is generated, the backend pushes an event to the `user:{user_id}` Phoenix Channel. 
*   **UI:** 
    *   A "Bell" icon in the React top navigation bar.
    *   A red badge counter for unread messages.
    *   Toast pop-ups for users actively viewing a different page.
*   **Database:** A `notifications` table in PostgreSQL tracks `user_id`, `type`, `content`, and a boolean `is_read`.

### B. Email Delivery
*   **Technology:** **Swoosh** (Elixir's standard mailing library) integrated with a modern provider like **Resend** or **Postmark**.
*   **Mechanism:** Designed for rich, branded content. E.g., showing the AI Match Score breakdown directly in the email body.
*   **Requirements:** 
    *   HTML/CSS email templates (Phoenix `.heex` templates work perfectly here).
    *   Verified domain DNS records (SPF, DKIM, DMARC) to ensure emails don't hit the spam folder.

### C. WhatsApp Delivery
*   **Technology:** **Whapi.cloud** (as requested in the Roadmap) or **Twilio WhatsApp API**.
*   **Mechanism:** Used strictly for high-priority alerts to get the user to open the app immediately.
*   **UX Note:** WhatsApp messages should be extremely brief and include a direct link to the app:
    *   *"🟢 Vokazi: You have a 92% Match with a new Founder. Review their Offer and stake to unlock the intro: https://vokazi.ai/matches"*
*   **Requirements:** 
    *   WhatsApp Business API access.
    *   For Twilio/Meta directly, you must use pre-approved "Template Messages" for user-initiated conversations that have exceeded the 24-hour window. Whapi.cloud often provides slightly more flexibility by mirroring a physical device session.

---

## 4. Data Modeling & Preferences

To be professional, we must never spam our users. The system requires a `user_notification_preferences` schema:

```elixir
# Example Elixir Schema Concept
schema "user_notification_preferences" do
  belongs_to :user, User
  
  field :email_new_match, :boolean, default: true
  field :whatsapp_new_match, :boolean, default: true
  field :in_app_sounds, :boolean, default: true
  
  # "Quiet Hours" or "Do Not Disturb" settings for future scaling
  field :quiet_hours_start, :time
  field :quiet_hours_end, :time
end
```

---

## 5. Technical Requirements Check-list

**Backend (Elixir/Phoenix):**
- [ ] Add **Oban** dependency to `mix.exs` for background job queues.
- [ ] Add **Swoosh** dependency and configure a mailer provider (e.g., Resend).
- [ ] Create HTTP client wrapper (using `Req` or `Finch`) for Whapi.cloud/Twilio API.
- [ ] Database migrations: Create `notifications` and `notification_preferences` tables.

**Frontend (React):**
- [ ] Build a `NotificationDropdown.jsx` component.
- [ ] Subscribe to the user's personal Phoenix Channel for live updates.
- [ ] Add a "Settings" page UI where users can toggle Email/WhatsApp preferences on and off.

**Infrastructure/3rd Party:**
- [ ] Register for a Whapi.cloud (or Twilio) account and obtain API keys.
- [ ] Register for an Email Provider (Resend/Sendgrid) and verify domain DNS.

---

## 6. Phased Build Plan

**Phase 1: In-App Foundation**
Build the database tables, the Elixir PubSub routing, and the React Bell Icon. This proves the internal routing works without paying for external APIs.

**Phase 2: Email Integration**
Implement Swoosh, design an HTML email template for "New Match", and trigger it asynchronously via Oban.

**Phase 3: WhatsApp Integration**
Integrate the Whapi.cloud API. Implement the logic that checks the 24-hour window (if required by the provider) and sends the mobile push.

**Phase 4: User Control**
Build the frontend settings page so users can opt out of specific channels, ensuring compliance with anti-spam regulations.
