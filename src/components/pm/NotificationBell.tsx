import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  created_at: string;
  type: string;
  title: string;
  body: string | null;
  job_name: string | null;
  from_user: string | null;
  to_user: string | null;
  priority: string | null;
  read: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  material_request: "📦",
  inspection_request: "🔍",
  task_assigned: "✅",
  material_ordered: "🚛",
  material_delivered: "✔",
  phase_complete: "🏁",
  invoice_generated: "💰",
  budget_alert: "⚠",
  general: "•",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "var(--danger)",
  urgent: "var(--warn)",
  normal: "transparent",
};

export const NotificationBell = ({ currentUser }: { currentUser: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .or(`to_user.eq.${currentUser},to_user.eq.ALL`)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data || []);
  };

  useEffect(() => {
    loadNotifications();
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        loadNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const timeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "relative", background: "transparent", border: "none",
          cursor: "pointer", padding: "6px 8px", display: "flex", alignItems: "center",
          color: unread > 0 ? "var(--gold)" : "var(--mil-muted)",
        }}
      >
        <span style={{ fontSize: "18px", lineHeight: 1 }}>🔔</span>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: "2px", right: "2px",
            background: "var(--danger)", color: "#fff",
            fontSize: "9px", fontWeight: "bold", fontFamily: "Rajdhani",
            borderRadius: "10px", minWidth: "16px", height: "16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px", lineHeight: 1,
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "100%", width: "340px", maxHeight: "420px",
          background: "var(--ink)", border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: "4px", zIndex: 1000, overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <span style={{ fontSize: "11px", fontFamily: "Rajdhani", fontWeight: "bold", letterSpacing: ".08em", color: "var(--gold)" }}>
              NOTIFICATIONS {unread > 0 && `(${unread} new)`}
            </span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: "none", border: "none", fontSize: "10px", color: "var(--mil-muted)", cursor: "pointer", fontFamily: "Rajdhani" }}>
                MARK ALL READ
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", maxHeight: "360px" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "var(--mil-muted)" }}>No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: n.read ? "transparent" : "rgba(201,168,76,0.04)",
                  borderLeft: `3px solid ${PRIORITY_COLORS[n.priority || "normal"] || "transparent"}`,
                  cursor: "default",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", color: "var(--cream)", fontWeight: n.read ? "normal" : "bold", display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "13px" }}>{TYPE_ICONS[n.type] || "•"}</span>
                        {n.title}
                      </div>
                      {n.body && <div style={{ fontSize: "11px", color: "var(--mil-muted)", marginTop: "2px" }}>{n.body}</div>}
                      {n.job_name && <div style={{ fontSize: "10px", color: "var(--gold)", marginTop: "2px", fontFamily: "Rajdhani" }}>{n.job_name}</div>}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--mil-muted)", whiteSpace: "nowrap" }}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
