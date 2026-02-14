import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "../api/client";
import { AlertTriangle } from "lucide-react";

export default function Settings() {
  const [health, setHealth] = useState<{
    version: string;
    uptime: number;
  } | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordForm.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setChanging(true);
    try {
      await api.changePassword(passwordForm.current, passwordForm.new);
      toast.success("Password changed");
      setPasswordForm({ current: "", new: "", confirm: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setChanging(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold">Settings</h1>

      {/* Server Info */}
      <div className="border border-border rounded-lg p-4 bg-bg-secondary space-y-3">
        <h2 className="text-sm font-medium">Server Info</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-text-tertiary">Version</span>
            <p className="font-mono">{health?.version ?? "—"}</p>
          </div>
          <div>
            <span className="text-text-tertiary">Uptime</span>
            <p>{health ? formatUptime(health.uptime) : "—"}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="border border-border rounded-lg p-4 bg-bg-secondary">
        <h2 className="text-sm font-medium mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input
            type="password"
            value={passwordForm.current}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, current: e.target.value })
            }
            placeholder="Current password"
            required
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            value={passwordForm.new}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, new: e.target.value })
            }
            placeholder="New password (min 8 characters)"
            required
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            value={passwordForm.confirm}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, confirm: e.target.value })
            }
            placeholder="Confirm new password"
            required
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={changing}
            className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50"
          >
            {changing ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="border border-danger/30 rounded-lg p-4 bg-bg-secondary">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-danger" />
          <h2 className="text-sm font-medium text-danger">Danger Zone</h2>
        </div>
        <p className="text-xs text-text-tertiary mb-4">
          These actions are irreversible. Proceed with extreme caution.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (
                confirm(
                  "Are you sure? This will require re-encrypting all keys."
                )
              ) {
                if (confirm("This is your last chance to cancel.")) {
                  toast.error("Not implemented in this version");
                }
              }
            }}
            className="px-3 py-1.5 text-xs border border-danger/30 text-danger rounded-md hover:bg-danger/10 transition-colors"
          >
            Reset Master Key
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  "This will permanently delete ALL keys, agents, and audit logs. Are you sure?"
                )
              ) {
                if (confirm("THIS CANNOT BE UNDONE. Final confirmation?")) {
                  toast.error("Not implemented in this version");
                }
              }
            }}
            className="px-3 py-1.5 text-xs border border-danger/30 text-danger rounded-md hover:bg-danger/10 transition-colors"
          >
            Wipe All Data
          </button>
        </div>
      </div>
    </div>
  );
}
