import { CheckCircle, XCircle, Key, Shield } from "lucide-react";
import type { AuditEntry } from "../api/client";

interface ActivityFeedProps {
  entries: AuditEntry[];
}

function getActionIcon(action: string, success: boolean | null) {
  if (!success) return <XCircle size={14} className="text-danger" />;
  if (action.includes("key")) return <Key size={14} className="text-accent" />;
  return <CheckCircle size={14} className="text-success" />;
}

function formatTime(ts: string | null) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

export default function ActivityFeed({ entries }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-text-tertiary text-sm">
        <Shield size={32} className="mx-auto mb-2 opacity-30" />
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-bg-hover transition-colors text-sm"
        >
          {getActionIcon(entry.action, entry.success)}
          <span className="text-text-secondary flex-1 truncate">
            <span className="text-text-primary font-medium">
              {entry.agentName ?? "admin"}
            </span>{" "}
            {entry.action.replace(/_/g, " ")}
            {entry.keyName && (
              <>
                {" "}
                <span className="text-accent">{entry.keyName}</span>
              </>
            )}
          </span>
          <span className="text-text-tertiary text-xs shrink-0">
            {formatTime(entry.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}
