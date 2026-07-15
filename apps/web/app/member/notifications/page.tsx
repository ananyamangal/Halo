"use client";

import { useMember } from "@/lib/member/store";
import { relTime, dateLabel } from "@/lib/member/format";
import type { NotificationKind } from "@/lib/member/types";
import Icon from "@/components/member/Icon";

const ICON: Record<NotificationKind, string> = {
  appointment: "calendar",
  confirmation: "checkCircle",
  claim: "clipboard",
  bill: "file",
  reminder: "clock",
  virtual: "monitor",
};

export default function NotificationsPage() {
  const { notifications, unread, markRead, markAllRead } = useMember();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">{unread > 0 ? `${unread} unread` : "You're all caught up"}</p>
        </div>
        {unread > 0 && (
          <button className="mp-btn outline sm" onClick={markAllRead}>Mark all as read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty">
          <div className="em-ic"><Icon name="bell" size={30} /></div>
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="mp-card">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="row-item"
              style={{ cursor: n.read ? "default" : "pointer", opacity: n.read ? 0.7 : 1 }}
              onClick={() => { if (!n.read) markRead(n.id); }}
            >
              <div className="r-ic"><Icon name={ICON[n.kind] ?? "bell"} size={20} /></div>
              <div className="r-main">
                <div className="r-title">{n.title}</div>
                <div className="r-sub">{n.body}</div>
                <div className="r-sub" style={{ marginTop: 2 }}>
                  {relTime(n.createdAt)}
                  {n.dueDate && ` · due ${dateLabel(n.dueDate)}`}
                </div>
              </div>
              {!n.read && (
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--teal)", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
