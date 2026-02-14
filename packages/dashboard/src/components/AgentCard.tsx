import { Bot, Trash2, RotateCcw, Ban } from "lucide-react";
import type { Agent } from "../api/client";

interface AgentCardProps {
  agent: Agent;
  onDelete: (id: string) => void;
  onRevoke: (id: string) => void;
  onRotate: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}

export default function AgentCard({
  agent,
  onDelete,
  onRevoke,
  onRotate,
  onToggle,
}: AgentCardProps) {
  return (
    <div className="border border-border rounded-lg p-4 hover:border-border-hover transition-colors bg-bg-secondary">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-bg-tertiary rounded-md">
            <Bot size={16} className={agent.isActive ? "text-success" : "text-text-tertiary"} />
          </div>
          <div>
            <h3 className="font-medium text-sm">{agent.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  agent.isActive
                    ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"
                }`}
              >
                {agent.isActive ? "active" : "inactive"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggle(agent.id, !agent.isActive)}
            className="text-text-tertiary hover:text-warning transition-colors p-1"
            title={agent.isActive ? "Deactivate" : "Activate"}
          >
            <Ban size={14} />
          </button>
          <button
            onClick={() => onRotate(agent.id)}
            className="text-text-tertiary hover:text-accent transition-colors p-1"
            title="Rotate token"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => onRevoke(agent.id)}
            className="text-text-tertiary hover:text-warning transition-colors p-1"
            title="Revoke"
          >
            <Ban size={14} />
          </button>
          <button
            onClick={() => onDelete(agent.id)}
            className="text-text-tertiary hover:text-danger transition-colors p-1"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex flex-wrap gap-1">
          {(agent.scopes as string[]).map((scope) => (
            <span
              key={scope}
              className="text-xs px-2 py-0.5 bg-bg-tertiary rounded text-text-secondary"
            >
              {scope}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-text-tertiary">
        {agent.budgetLimitDaily && (
          <span>Budget: {agent.budgetLimitDaily}/day</span>
        )}
        <span>
          Last active:{" "}
          {agent.lastAccessed
            ? new Date(agent.lastAccessed).toLocaleDateString()
            : "Never"}
        </span>
      </div>
    </div>
  );
}
