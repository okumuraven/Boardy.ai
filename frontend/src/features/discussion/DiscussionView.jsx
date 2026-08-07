import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import Avatar from "../../components/Avatar";
import { DiscussionIcon } from "../shell/icons";
import "./Discussion.css";

const dateLabel = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(new Date()) - startOf(date)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

// Read-only feed of admin-posted prompts - no replies, no reactions, no
// per-user state to track. Deliberately just a browsable list: the
// point is an async, look-when-you-feel-like-it surface, not another
// place that expects real-time engagement (see kuzana_connect_discovery.md).
export default function DiscussionView() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch("/api/discussion_topics")
      .then((res) => res.json())
      .then((data) => setTopics(data.topics || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="discussion-view">
      <div className="discussion-view-content">
        <header className="discussion-header">
          <div>
            <h2>Discussion</h2>
            <p className="discussion-subhead">Prompts from the Kuzana team - browse whenever you like.</p>
          </div>
          {!loading && topics.length > 0 && (
            <span className="count">{topics.length} {topics.length === 1 ? "topic" : "topics"}</span>
          )}
        </header>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--muted)" }}>
            <div className="spinner" style={{ width: "22px", height: "22px", margin: "0 auto" }}></div>
          </div>
        ) : topics.length === 0 ? (
          <div className="discussion-empty">
            <DiscussionIcon />
            <p className="discussion-empty-title">Nothing posted yet</p>
            <p className="discussion-empty-sub">Check back soon for a topic from the Kuzana team.</p>
          </div>
        ) : (
          <div className="discussion-list">
            {topics.map((topic) => (
              <article key={topic.id} className="discussion-card corner-tick">
                <div className="discussion-byline">
                  <Avatar name={topic.posted_by} className="discussion-avatar" />
                  <div className="discussion-byline-text">
                    <span className="discussion-by">{topic.posted_by || "Kuzana team"}</span>
                    <span className="discussion-role">Kuzana team</span>
                  </div>
                  <span className="discussion-time">{dateLabel(topic.inserted_at)}</span>
                </div>
                <h3 className="discussion-title">{topic.title}</h3>
                <p className="discussion-body">{topic.body}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
