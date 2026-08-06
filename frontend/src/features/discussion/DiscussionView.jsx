import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import "./Discussion.css";

const dateLabel = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
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
      <header className="discussion-header">
        <h2>Discussion</h2>
        <span className="count">{topics.length} topics</span>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          <div className="spinner" style={{ width: "22px", height: "22px", margin: "0 auto" }}></div>
        </div>
      ) : topics.length === 0 ? (
        <p style={{ padding: "0 1.1rem", color: "var(--muted)", fontSize: "0.85rem" }}>
          Nothing posted yet — check back for topics from the Kuzana team.
        </p>
      ) : (
        <div className="discussion-list">
          {topics.map((topic) => (
            <div key={topic.id} className="discussion-card">
              <div className="discussion-top">
                <span className="discussion-title">{topic.title}</span>
                <span className="discussion-time">{dateLabel(topic.inserted_at)}</span>
              </div>
              <p className="discussion-body">{topic.body}</p>
              {topic.posted_by && <span className="discussion-by">Posted by {topic.posted_by}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
