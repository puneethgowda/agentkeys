import { useState, useEffect, useCallback } from "react";
import { api, type AuditEntry, type Pagination } from "../api/client";

export function useAudit(filters?: Record<string, string>) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (params?: Record<string, string>) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAudit(params ?? filters);
      setEntries(data.entries);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, pagination, loading, error, refresh };
}
