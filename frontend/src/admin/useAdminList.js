import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

// Shared pagination/fetch plumbing for every Phase 1 list view (Members,
// Matches, Schedules) - they all hit a `%{items:, page:, total_pages:}`
// shaped endpoint with the same page-param convention, so this is the
// one place that logic lives instead of four near-identical copies.
export function useAdminList(path, params, itemsKey) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total_pages: 1, total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const paramsKey = JSON.stringify(params);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ ...params, page: String(page) });
      const res = await apiFetch(`${path}?${query.toString()}`);
      if (!res.ok) throw new Error('Request failed');
      const json = await res.json();
      setData({ items: json[itemsKey] || [], total_pages: json.total_pages || 1, total_count: json.total_count || 0 });
    } catch {
      setError("Couldn't load this list.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey, page, itemsKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [paramsKey]);

  return { ...data, page, setPage, loading, error, reload: load };
}
