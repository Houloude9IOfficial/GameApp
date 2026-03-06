import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { formatRelativeTime } from '../../utils/formatters';

const typeIcons: Record<string, React.ReactNode> = {
  info: <Info size={14} className="text-info" />,
  success: <CheckCircle size={14} className="text-success" />,
  warning: <AlertTriangle size={14} className="text-warning" />,
  error: <AlertCircle size={14} className="text-danger" />,
  server_announcement: <Info size={14} className="text-accent" />,
  game_update: <CheckCircle size={14} className="text-success" />,
  new_game: <Info size={14} className="text-info" />,
};

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead, dismiss } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 flex items-center justify-center rounded hover:bg-surface-hover transition-colors"
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-primary">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-96 bg-card border border-card-border rounded-xl shadow-lg z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-card-border">
            <span className="text-sm font-semibold text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-text-muted text-sm">No notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-card-border/50 hover:bg-surface-hover transition-colors cursor-pointer ${
                    !n.read ? 'bg-surface/50' : ''
                  }`}
                  onClick={() => { if (!n.read) markRead(n.id); }}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">{typeIcons[n.type] || typeIcons.info}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${!n.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {n.title}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                          className="text-text-muted hover:text-text-primary ml-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-text-muted mt-1 block">{formatRelativeTime(n.createdAt)}</span>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-accent mt-1 shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
