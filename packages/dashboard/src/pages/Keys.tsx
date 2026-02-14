import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { useKeys } from "../hooks/useKeys";
import KeyCard from "../components/KeyCard";
import Modal from "../components/Modal";

export default function Keys() {
  const { keys, loading, refresh } = useKeys();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", value: "", provider: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createKey({
        name: form.name,
        value: form.value,
        provider: form.provider || undefined,
      });
      toast.success(`Key "${form.name}" stored`);
      setShowAdd(false);
      setForm({ name: "", value: "", provider: "" });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add key");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this key? This cannot be undone.")) return;
    try {
      await api.deleteKey(id);
      toast.success("Key deleted");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">API Keys</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
        >
          <Plus size={14} />
          Add Key
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-tertiary">Loading...</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-text-secondary">No API keys stored yet</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-2 text-sm text-accent hover:text-accent-hover"
          >
            Add your first key
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {keys.map((k) => (
            <KeyCard key={k.id} keyData={k} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add API Key"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. openai, gmail"
              required
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Provider (optional)
            </label>
            <input
              type="text"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              placeholder="e.g. OpenAI, Google"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Key Value
            </label>
            <input
              type="password"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder="sk-..."
              required
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm focus:outline-none focus:border-accent font-mono"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50"
            >
              {submitting ? "Storing..." : "Store Key"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
