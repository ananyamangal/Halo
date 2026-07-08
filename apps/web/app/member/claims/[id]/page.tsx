"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useMember } from "@/lib/member/store";
import { usd, dateLabel } from "@/lib/member/format";
import type { ClaimStatus } from "@/lib/member/types";
import StatusBadge from "@/components/member/StatusBadge";

const FLOW: ClaimStatus[] = ["Submitted", "Processing", "Approved", "Paid"];

type StepState = "done" | "active" | "pending";

export default function ClaimDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { claims } = useMember();
  const claim = useMemo(() => claims.find((c) => c.id === id), [claims, id]);

  if (!claim) {
    return (
      <>
        <Link href="/member/claims" className="mp-btn ghost sm">← Back to claims</Link>
        <div className="empty">
          <div className="em-ic">🤷</div>
          <p>We couldn&apos;t find that claim.</p>
          <Link href="/member/claims" className="mp-btn primary sm">View all claims</Link>
        </div>
      </>
    );
  }

  const rejected = claim.status === "Rejected";
  const currentIdx = FLOW.indexOf(claim.status);

  const stepState = (i: number): StepState => {
    if (i < currentIdx) return "done";
    if (i === currentIdx) return "active";
    return "pending";
  };

  return (
    <>
      <Link href="/member/claims" className="mp-btn ghost sm" style={{ marginBottom: 12 }}>
        ← Back to claims
      </Link>

      <div className="mp-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: 19 }}>{claim.provider}</h3>
            <div className="card-sub">
              {claim.service} · {dateLabel(claim.serviceDate)} · {claim.category}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className={"mp-badge " + (claim.network === "In-Network" ? "b-green" : "b-red")}>
                {claim.network}
              </span>
              <StatusBadge status={claim.status} />
              {claim.uploaded && <span className="mp-badge b-blue">Uploaded bill</span>}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Claim ID {claim.id}</div>
        </div>
      </div>

      <div className="ins-tiles" style={{ gridTemplateColumns: "repeat(5, 1fr)", margin: "16px 0" }}>
        <div className="ins-tile">
          <div className="t-label">Total billed</div>
          <div className="t-val">{usd(claim.billed)}</div>
        </div>
        <div className="ins-tile">
          <div className="t-label">Allowed</div>
          <div className="t-val">{usd(claim.allowed)}</div>
        </div>
        <div className="ins-tile">
          <div className="t-label">Insurance paid</div>
          <div className="t-val">{usd(claim.insurancePaid)}</div>
        </div>
        <div className="ins-tile">
          <div className="t-label">Member responsibility</div>
          <div className="t-val">{usd(claim.memberResp)}</div>
        </div>
        <div className="ins-tile">
          <div className="t-label">Deductible applied</div>
          <div className="t-val">{usd(claim.deductibleApplied)}</div>
        </div>
      </div>

      <div className="mp-card">
        <h3>Claim status</h3>
        <div className="card-sub">
          {rejected ? "This claim was not approved." : "Where your claim is in processing"}
        </div>

        {rejected ? (
          <div className="timeline" style={{ marginTop: 8 }}>
            <div className="tl-item">
              <div className="tl-dot done">✓</div>
              <div>
                <div style={{ fontWeight: 700 }}>Submitted</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Claim received.</div>
              </div>
            </div>
            <div className="tl-item">
              <div className="tl-dot" style={{ background: "var(--red)" }}>✕</div>
              <div>
                <div style={{ fontWeight: 700, color: "var(--red)" }}>Rejected</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {claim.diagnosis || "This claim was denied. Contact member support to appeal or resubmit."}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="timeline" style={{ marginTop: 8 }}>
            {FLOW.map((step, i) => {
              const s = stepState(i);
              return (
                <div key={step} className="tl-item">
                  <div className={"tl-dot " + s}>{s === "done" ? "✓" : s === "active" ? "•" : ""}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{step}</div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>
                      {s === "done" && "Completed"}
                      {s === "active" && "In progress"}
                      {s === "pending" && "Pending"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
