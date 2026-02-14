import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Key, Bot, Activity, Zap, Plus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api, type DashboardStats } from "../api/client";
import ActivityFeed from "../components/ActivityFeed";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-tertiary">
        Loading...
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: "Total Keys",
      value: stats.totalKeys,
      icon: Key,
      color: "text-accent",
    },
    {
      label: "Total Agents",
      value: stats.totalAgents,
      icon: Bot,
      color: "text-success",
    },
    {
      label: "Active (24h)",
      value: stats.activeAgents24h,
      icon: Activity,
      color: "text-warning",
    },
    {
      label: "Requests Today",
      value: stats.requestsToday,
      icon: Zap,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/keys")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
          >
            <Plus size={14} />
            Add Key
          </button>
          <button
            onClick={() => navigate("/agents")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border hover:bg-bg-hover rounded-md transition-colors"
          >
            <Plus size={14} />
            Create Agent
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="border border-border rounded-lg p-4 bg-bg-secondary"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <p className="text-2xl font-semibold mt-2">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="border border-border rounded-lg p-4 bg-bg-secondary">
          <h2 className="text-sm font-medium text-text-secondary mb-4">
            Requests (7 days)
          </h2>
          {stats.dailyRequests.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.dailyRequests}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#666" }}
                  axisLine={{ stroke: "#2a2a2a" }}
                  tickLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#666" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-tertiary text-sm">
              No data yet
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="border border-border rounded-lg p-4 bg-bg-secondary">
          <h2 className="text-sm font-medium text-text-secondary mb-4">
            Recent Activity
          </h2>
          <ActivityFeed entries={stats.recentActivity} />
        </div>
      </div>
    </div>
  );
}
