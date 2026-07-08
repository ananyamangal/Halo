"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMember } from "@/lib/member/store";

const NAV = [
  { href: "/member", label: "Dashboard", icon: "🏠", exact: true },
  { href: "/member/find-care", label: "Find Care", icon: "🧭" },
  { href: "/member/providers", label: "Providers", icon: "🩺" },
  { href: "/member/claims", label: "Claims", icon: "📋" },
  { href: "/member/upload-bill", label: "Upload Medical Bill", icon: "📄" },
  { href: "/member/virtual-care", label: "Virtual Care", icon: "💻" },
  { href: "/member/benefits", label: "Plan Benefits", icon: "🛡️" },
  { href: "/member/notifications", label: "Notifications", icon: "🔔" },
  { href: "/member/profile", label: "Profile", icon: "👤" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { loaded, member, unread, toastMsg } = useMember();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!loaded) {
    return (
      <div className="mp" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: 34 }}>🩺</div>
          <p>Loading your health portal…</p>
        </div>
      </div>
    );
  }

  const firstName = member.name.split(" ")[0];
  const isActive = (n: (typeof NAV)[number]) =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href);

  return (
    <div className="mp">
      <aside className={"mp-side" + (open ? " open" : "")}>
        <div className="mp-brand">
          <div className="mp-logo">✚</div>
          <div>
            <b>SummitBridge</b>
            <span>Member Portal</span>
          </div>
        </div>
        <nav className="mp-nav">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={isActive(n) ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              <span className="ic">{n.icon}</span>
              {n.label}
              {n.href === "/member/notifications" && unread > 0 && (
                <span className="badge-count">{unread}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mp-side-foot">
          <Link href="/" className="mp-back">← Back to CEO Dashboard</Link>
        </div>
      </aside>

      <div className="mp-main">
        <header className="mp-top">
          <button
            className="mp-iconbtn"
            style={{ display: "none" }}
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            ☰
          </button>
          <div className="greet">
            Hi, {firstName} 👋
            <small>{member.plan} · Member ID {member.memberId}</small>
          </div>
          <div className="spacer" />
          <Link href="/member/notifications" className="mp-iconbtn" aria-label="Notifications">
            🔔{unread > 0 && <span className="dot" />}
          </Link>
          <Link href="/member/profile" className="mp-avatar" aria-label="Profile">
            {firstName?.[0]}
            {member.name.split(" ")[1]?.[0]}
          </Link>
        </header>
        <div className="mp-content">{children}</div>
      </div>

      {toastMsg && <div className="mp-toast">{toastMsg}</div>}
    </div>
  );
}
