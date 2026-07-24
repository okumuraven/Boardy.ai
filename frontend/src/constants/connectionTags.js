// Mirrors Vokazi.Accounts.Profile.connection_tags/0 - keep both in sync.
// Drawn directly from what Kuzana's own members named in
// kuzana_connect_discovery.md ("What they are looking for").
export const CONNECTION_TAGS = ["funding", "customers", "partners", "mentors", "hiring"];

export const tagLabel = (tag) => `${tag.charAt(0).toUpperCase()}${tag.slice(1)}`;
