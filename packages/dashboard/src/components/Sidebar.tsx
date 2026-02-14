import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Key,
  Bot,
  ScrollText,
  Settings,
  LogOut,
} from "lucide-react";
import { clearToken } from "../api/client";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/keys", icon: Key, label: "Keys" },
  { to: "/agents", icon: Bot, label: "Agents" },
  { to: "/audit", icon: ScrollText, label: "Audit Log" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate("/login");
  };

  return (
    <aside className="w-56 border-r border-border bg-bg-secondary flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold tracking-tight">
          <span className="text-accent">Agent</span>Keys
        </h1>
        <p className="text-xs text-text-tertiary mt-0.5">API Key Manager</p>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-bg-tertiary text-text-primary"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary w-full transition-colors"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}
