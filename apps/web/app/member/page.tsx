"use client";

import Link from "next/link";
import { useState } from "react";
import { useMember } from "@/lib/member/store";
import { usd, dateLabel, relTime } from "@/lib/member/format";
import StatusBadge from "@/components/member/StatusBadge";

const QUICK = [
  { href: "/member/find-care", icon: "🧭", label: "Find Care" },
  { href: "/member/providers", icon: "🩺", label: "Find Provider" },
  { href: "/member/upload-bill", icon: "📄", label: "Upload Bill" },
  { href: "/member/virtual-care", icon: "💻", label: "Virtual Care" },
  { href: "/member/claims", icon: "📋", label: "View Claims" },
];

function Bar({ met, max }: { met: number; max: number }) {
  const pctv = Math.min(100, max ? (met / max) * 100 : 0);
  return (
    <div className="bar">
      <i style={{ width: `${pctv}%` }} />
    </div>
  );
}

export default function MemberDashboard() {
  const { member, plan, claims, upcoming, notifications } = useMember();
  const [flipped, setFlipped] = useState(false);
  const remainingDed = Math.max(0, plan.deductible - plan.deductibleMet);

  return (
    <>
      {/* Welcome */}
      <h1 className="page-title">Welcome back, {member.name.split(" ")[0]}</h1>
      <p className="page-sub">
        {member.plan} · Member ID {member.memberId} · Effective {dateLabel(member.effectiveDate)}
      </p>

      <div className="mp-grid g-2-1">
        {/* Insurance summary */}
        <div className="mp-card">
          <h3>Insurance summary</h3>
          <div className="card-sub">Your plan usage so far this year</div>
          <div className="ins-tiles">
            <div className="ins-tile">
              <div className="t-label">Deductible</div>
              <div className="t-val">{usd(plan.deductible)}</div>
              <Bar met={plan.deductibleMet} max={plan.deductible} />
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>
                {usd(plan.deductibleMet)} met
              </div>
            </div>
            <div className="ins-tile">
              <div className="t-label">Remaining Deductible</div>
              <div className="t-val">{usd(remainingDed)}</div>
              <Bar met={remainingDed} max={plan.deductible} />
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>to go</div>
            </div>
            <div className="ins-tile">
              <div className="t-label">Out-of-Pocket Max</div>
              <div className="t-val">{usd(plan.oopMax)}</div>
              <Bar met={plan.oopMet} max={plan.oopMax} />
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>
                {usd(plan.oopMet)} met
              </div>
            </div>
            <div className="ins-tile">
              <div className="t-label">PCP Copay</div>
              <div className="t-val">${plan.pcpCopay}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14 }}>per visit</div>
            </div>
            <div className="ins-tile">
              <div className="t-label">Specialist Copay</div>
              <div className="t-val">${plan.specialistCopay}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14 }}>per visit</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Link href="/member/benefits" className="mp-btn ghost sm">
              View full plan benefits →
            </Link>
          </div>
        </div>

        {/* Digital insurance card */}
        <div className="mp-card">
          <h3>Digital insurance card</h3>
          <div className="card-sub">Tap to flip</div>
          <div className="flipwrap">
            <div className={"flipcard" + (flipped ? " flipped" : "")} onClick={() => setFlipped((f) => !f)}>
              <div className="flipface front">
                <div className="ic-brand">✚ SummitBridge Health Plan</div>
                <div className="ic-row" style={{ marginTop: 18 }}>
                  <div>
                    <div className="ic-k">Member</div>
                    <div className="ic-v">{member.name}</div>
                  </div>
                  <div>
                    <div className="ic-k">Member ID</div>
                    <div className="ic-v">{member.memberId}</div>
                  </div>
                </div>
                <div className="ic-row" style={{ marginTop: 14 }}>
                  <div>
                    <div className="ic-k">Plan</div>
                    <div className="ic-v">{member.plan}</div>
                  </div>
                  <div>
                    <div className="ic-k">Group</div>
                    <div className="ic-v">{member.group || "—"}</div>
                  </div>
                  <div>
                    <div className="ic-k">Effective</div>
                    <div className="ic-v">{dateLabel(member.effectiveDate)}</div>
                  </div>
                </div>
              </div>
              <div className="flipface back">
                <div className="magstripe" />
                <div style={{ marginTop: 56 }} className="ic-row">
                  <div>
                    <div className="ic-k">PCP Copay</div>
                    <div className="ic-v">${plan.pcpCopay}</div>
                  </div>
                  <div>
                    <div className="ic-k">Specialist</div>
                    <div className="ic-v">${plan.specialistCopay}</div>
                  </div>
                  <div>
                    <div className="ic-k">ER</div>
                    <div className="ic-v">${plan.erCopay}</div>
                  </div>
                </div>
                <div className="ic-row" style={{ marginTop: 14 }}>
                  <div>
                    <div className="ic-k">Member Services</div>
                    <div className="ic-v">1-800-SUMMIT</div>
                  </div>
                  <div>
                    <div className="ic-k">RxBIN</div>
                    <div className="ic-v">610591</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 14 }}>
                  Present this card at your visit. Coverage per plan terms.
                </div>
              </div>
            </div>
          </div>
          <div className="flip-hint">🔄 Front / Back</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="section-h">Quick actions</div>
      <div className="qa-grid">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className="qa">
            <div className="qa-ic">{q.icon}</div>
            <div className="qa-lbl">{q.label}</div>
          </Link>
        ))}
      </div>

      {/* Appointments + claims + notifications */}
      <div className="mp-grid g3" style={{ marginTop: 24 }}>
        <div className="mp-card">
          <h3>Upcoming appointments</h3>
          <div className="card-sub">{upcoming.length} scheduled</div>
          {upcoming.length === 0 ? (
            <div className="empty">
              <div className="em-ic">📅</div>
              <p>No upcoming appointments.</p>
              <Link href="/member/find-care" className="mp-btn primary sm">Find care</Link>
            </div>
          ) : (
            upcoming.slice(0, 4).map((a) => (
              <div key={a.id} className="row-item">
                <div className="r-ic">{a.type === "virtual" ? "💻" : "🩺"}</div>
                <div className="r-main">
                  <div className="r-title">{a.providerName}</div>
                  <div className="r-sub">{a.whenLabel}</div>
                </div>
                <span className={"mp-badge " + (a.type === "virtual" ? "b-blue" : "b-teal")}>
                  {a.type === "virtual" ? "Virtual" : "In-person"}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mp-card">
          <h3>Recent claims</h3>
          <div className="card-sub">Latest activity</div>
          {claims.slice(0, 4).map((c) => (
            <Link key={c.id} href={`/member/claims/${c.id}`} className="row-item" style={{ cursor: "pointer" }}>
              <div className="r-ic">🧾</div>
              <div className="r-main">
                <div className="r-title">{c.provider}</div>
                <div className="r-sub">{dateLabel(c.serviceDate)} · {usd(c.memberResp)} you owe</div>
              </div>
              <StatusBadge status={c.status} />
            </Link>
          ))}
          <div style={{ marginTop: 10 }}>
            <Link href="/member/claims" className="mp-btn ghost sm">View all claims →</Link>
          </div>
        </div>

        <div className="mp-card">
          <h3>Notifications</h3>
          <div className="card-sub">Reminders & updates</div>
          {notifications.slice(0, 4).map((n) => (
            <div key={n.id} className="row-item">
              <div className="r-ic">
                {n.kind === "reminder" ? "⏰" : n.kind === "claim" ? "📋" : n.kind === "bill" ? "📄" : n.kind === "virtual" ? "💻" : "✅"}
              </div>
              <div className="r-main">
                <div className="r-title" style={{ fontSize: 13.5 }}>{n.title}</div>
                <div className="r-sub">{relTime(n.createdAt)}</div>
              </div>
              {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal)" }} />}
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <Link href="/member/notifications" className="mp-btn ghost sm">View all →</Link>
          </div>
        </div>
      </div>
    </>
  );
}
