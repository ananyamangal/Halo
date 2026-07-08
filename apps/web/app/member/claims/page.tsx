"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMember } from "@/lib/member/store";
import { usd, dateLabel } from "@/lib/member/format";
import type { ClaimStatus } from "@/lib/member/types";
import StatusBadge from "@/components/member/StatusBadge";

const STATUSES: (ClaimStatus | "All")[] = ["All", "Submitted", "Processing", "Approved", "Paid", "Rejected"];

export default function ClaimsPage() {
  const { claims } = useMember();
  const [status, setStatus] = useState<ClaimStatus | "All">("All");

  const filtered = useMemo(
    () => (status === "All" ? claims : claims.filter((c) => c.status === status)),
    [claims, status],
  );

  const totalOwe = claims.reduce((s, c) => s + c.memberResp, 0);
  const totalPaid = claims.reduce((s, c) => s + c.insurancePaid, 0);

  return (
    <>
      <h1 className="page-title">Your claims</h1>
      <p className="page-sub">Track how each visit was processed and what you owe.</p>

      <div className="ins-tiles" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 18 }}>
        <div className="ins-tile">
          <div className="t-label">Total claims</div>
          <div className="t-val">{claims.length}</div>
        </div>
        <div className="ins-tile">
          <div className="t-label">Total you owe</div>
          <div className="t-val">{usd(totalOwe)}</div>
        </div>
        <div className="ins-tile">
          <div className="t-label">Total plan paid</div>
          <div className="t-val">{usd(totalPaid)}</div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 14 }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={"mp-btn sm " + (status === s ? "primary" : "outline")}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="em-ic">📋</div>
          <p>No claims with this status.</p>
        </div>
      ) : (
        <div className="mp-card">
          {filtered.map((c) => (
            <Link key={c.id} href={`/member/claims/${c.id}`} className="row-item" style={{ cursor: "pointer" }}>
              <div className="r-ic">🧾</div>
              <div className="r-main">
                <div className="r-title">{c.provider}</div>
                <div className="r-sub">
                  {c.service} · {dateLabel(c.serviceDate)} · Billed {usd(c.billed)} / Allowed {usd(c.allowed)}
                </div>
              </div>
              <div className="r-right" style={{ minWidth: 120 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{usd(c.memberResp)} you owe</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{usd(c.insurancePaid)} plan paid</div>
              </div>
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
