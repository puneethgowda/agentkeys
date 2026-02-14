import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useAudit } from "../hooks/useAudit";

export default function AuditLog() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { entries, pagination, loading, refresh } = useAudit(filters);

  const updateFilter = (key: string, value: string) => {
    const next = { ...filters };
    if (value) {
      next[key] = value;
    } else {
      delete next[key];
    }
    setFilters(next);
    refresh(next);
  };

  const goToPage = (page: number) => {
    const next = { ...filters, page: String(page) };
    setFilters(next);
    refresh(next);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Audit Log</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder="Search agent..."
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9 pr-3 py-1.5 bg-bg-secondary border border-border rounded-md text-sm focus:outline-none focus:border-accent w-48"
          />
        </div>
        <select
          onChange={(e) => updateFilter("action", e.target.value)}
          className="px-3 py-1.5 bg-bg-secondary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
        >
          <option value="">All actions</option>
          <option value="key_requested">Key Requested</option>
          <option value="key_denied">Key Denied</option>
          <option value="key_released">Key Released</option>
        </select>
        <select
          onChange={(e) => updateFilter("success", e.target.value)}
          className="px-3 py-1.5 bg-bg-secondary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
        >
          <option value="">All statuses</option>
          <option value="true">Success</option>
          <option value="false">Denied</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-secondary text-text-secondary text-left">
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8 text-text-tertiary"
                >
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8 text-text-tertiary"
                >
                  No audit entries found
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-t border-border hover:bg-bg-hover transition-colors"
                >
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {entry.timestamp
                      ? new Date(entry.timestamp).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {entry.agentName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-accent">
                    {entry.keyName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {entry.action.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-text-tertiary text-xs font-mono">
                    {entry.ipAddress ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        entry.success
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {entry.success ? "success" : "denied"}
                    </span>
                    {entry.denialReason && (
                      <p className="text-xs text-text-tertiary mt-1 max-w-[200px] truncate">
                        {entry.denialReason}
                      </p>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-tertiary">
            {pagination.total} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 border border-border rounded hover:bg-bg-hover disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm text-text-secondary">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-1.5 border border-border rounded hover:bg-bg-hover disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
