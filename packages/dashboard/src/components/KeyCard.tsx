import { Key as KeyIcon, Trash2 } from "lucide-react";
import type { Key } from "../api/client";

interface KeyCardProps {
  keyData: Key;
  onDelete: (id: string) => void;
}

export default function KeyCard({ keyData, onDelete }: KeyCardProps) {
  return (
    <div className="border border-border rounded-lg p-4 hover:border-border-hover transition-colors bg-bg-secondary">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-bg-tertiary rounded-md">
            <KeyIcon size={16} className="text-accent" />
          </div>
          <div>
            <h3 className="font-medium text-sm">{keyData.name}</h3>
            {keyData.provider && (
              <p className="text-xs text-text-tertiary">{keyData.provider}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(keyData.id)}
          className="text-text-tertiary hover:text-danger transition-colors p-1"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-text-tertiary">
        <span>Created {keyData.createdAt ? new Date(keyData.createdAt).toLocaleDateString() : "—"}</span>
      </div>
    </div>
  );
}
