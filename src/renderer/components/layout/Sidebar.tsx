import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Gamepad2, Camera, Newspaper,
  Store, Globe, Bookmark, Download,
  ChevronLeft, ChevronRight, Settings,
  HardDrive, Users, Activity,
} from "lucide-react";
import { useDownloadStore } from "../../stores/useDownloadStore";
import { formatBytes } from "../../utils/formatters";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { ControllerStatus } from "../common/ControllerStatus";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  section?: string;
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [diskSpace, setDiskSpace] = useState({ free: 0, total: 0 });
  const activeCount = useDownloadStore(s => s.getActiveCount());
  const settings = useSettingsStore(s => s.settings);

  useEffect(() => {
    if (settings?.installDirectory) {
      window.electronAPI.getDiskSpace(settings.installDirectory).then(setDiskSpace);
    }
  }, [settings?.installDirectory]);

  const navItems: NavItem[] = [
    // Store
    { id: "store", label: "Market", icon: <Store size={20} />, path: "/store", section: "STORE" },
    // Library
    { id: "library", label: "My Games", icon: <Gamepad2 size={20} />, path: "/", section: "LIBRARY" },
    // Downloads
    { id: "downloads", label: "Downloads", icon: <Download size={20} />, path: "/downloads", badge: activeCount > 0 ? activeCount : undefined },
    // Social
    { id: "friends", label: "Friends", icon: <Users size={20} />, path: "/friends", section: "SOCIAL" },
    { id: "activity", label: "Activity", icon: <Activity size={20} />, path: "/activity" },
    // Settings
    { id: "settings", label: "Settings", icon: <Settings size={20} />, path: "/settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const usedPercent = diskSpace.total > 0
    ? Math.round((1 - diskSpace.free / diskSpace.total) * 100)
    : 0;

  return (
    <div
      className="flex flex-col bg-sidebar border-r border-card-border transition-all duration-300 shrink-0"
      style={{ width: collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)" }}
    >
      {/* Nav Items */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item, index) => (
          <React.Fragment key={item.id}>
            {/* Section Header */}
            {item.section && !collapsed && (
              <div className="px-4 pt-4 pb-1.5 first:pt-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  {item.section}
                </span>
              </div>
            )}
            {item.section && collapsed && index > 0 && (
              <div className="mx-3 my-2 border-t border-card-border" />
            )}

            {/* Nav Item */}
            <button
              onClick={() => navigate(item.path)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-150
                ${collapsed ? "justify-center px-0" : ""}
                ${isActive(item.path)
                  ? "bg-sidebar-active text-accent border-l-2 border-accent"
                  : "text-sidebar-text hover:bg-sidebar-hover hover:text-text-primary border-l-2 border-transparent"
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0 relative">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-primary">
                    {item.badge}
                  </span>
                )}
              </span>
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* Controllers Section */}
      <ControllerStatus collapsed={collapsed} />

      {/* Storage Indicator */}
      <div className={`p-3 border-t border-card-border ${collapsed ? "px-2" : ""}`}>
        {!collapsed && diskSpace.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-text-muted">
              <HardDrive size={14} />
              <span className="text-xs font-medium">Storage</span>
            </div>
            <div className="w-full h-1.5 bg-surface-active rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usedPercent > 90 ? "bg-danger" : usedPercent > 70 ? "bg-warning" : "bg-accent"
                }`}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <div className="text-[11px] text-text-muted">
              {formatBytes(diskSpace.total - diskSpace.free)} / {formatBytes(diskSpace.total)}
            </div>
          </div>
        )}
        {collapsed && diskSpace.total > 0 && (
          <div className="flex justify-center" title={`${formatBytes(diskSpace.total - diskSpace.free)} / ${formatBytes(diskSpace.total)}`}>
            <HardDrive size={16} className="text-text-muted" />
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-2 border-t border-card-border text-text-muted hover:text-text-primary transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );
}
