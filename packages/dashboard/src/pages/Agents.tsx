import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { useAgents } from "../hooks/useAgents";
import { useKeys } from "../hooks/useKeys";
import AgentCard from "../components/AgentCard";
import ScopeToggle from "../components/ScopeToggle";
import CopyButton from "../components/CopyButton";
import Modal from "../components/Modal";

export default function Agents() {
  const { agents, loading, refresh } = useAgents();
  const { keys } = useKeys();
  const [showCreate, setShowCreate] = useState(false);
  const [showToken, setShowToken] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", scopes: [] as string[], budget: "" });
  const [submitting, setSubmitting] = useState(false);

  const availableScopes = keys.map((k) => k.name);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (form.scopes.length === 0) {
      toast.error("Select at least one scope");
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.createAgent({
        name: form.name,
        scopes: form.scopes,
        budgetLimitDaily: form.budget ? parseInt(form.budget) : undefined,
      });
      setShowCreate(false);
      setShowToken(data.token);
      setForm({ name: "", scopes: [], budget: "" });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    try {
      await api.deleteAgent(id);
      toast.success("Agent deleted");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this agent? It will be deactivated.")) return;
    try {
      await api.revokeAgent(id);
      toast.success("Agent revoked");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke");
    }
  };

  const handleRotate = async (id: string) => {
    if (!confirm("Rotate this agent's token? The old token will stop working.")) return;
    try {
      const data = await api.rotateAgent(id);
      setShowToken(data.token);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rotate");
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await api.updateAgent(id, { isActive: active });
      toast.success(active ? "Agent activated" : "Agent deactivated");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Agents</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
        >
          <Plus size={14} />
          Create Agent
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-tertiary">Loading...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-text-secondary">No agents created yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 text-sm text-accent hover:text-accent-hover"
          >
            Create your first agent
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              onDelete={handleDelete}
              onRevoke={handleRevoke}
              onRotate={handleRotate}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Create Agent Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Agent"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. email-bot"
              required
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Scopes (keys this agent can access)
            </label>
            {availableScopes.length > 0 ? (
              <ScopeToggle
                availableScopes={availableScopes}
                selectedScopes={form.scopes}
                onChange={(scopes) => setForm({ ...form, scopes })}
              />
            ) : (
              <p className="text-xs text-text-tertiary">
                Add API keys first, then create agents.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Daily Budget (optional)
            </label>
            <input
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="e.g. 100"
              min="1"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Agent"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Token Display Modal */}
      <Modal
        isOpen={!!showToken}
        onClose={() => setShowToken(null)}
        title="Agent Token"
      >
        <div className="space-y-4">
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
            <p className="text-xs text-warning font-medium">
              Save this token now. It will not be shown again.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-bg-tertiary rounded-md text-sm font-mono break-all">
              {showToken}
            </code>
            <CopyButton text={showToken ?? ""} />
          </div>
          <button
            onClick={() => setShowToken(null)}
            className="w-full py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
          >
            I&apos;ve saved the token
          </button>
        </div>
      </Modal>
    </div>
  );
}
