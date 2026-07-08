"use client";

import { useState } from "react";
import { useMember } from "@/lib/member/store";
import { usd } from "@/lib/member/format";

const SUPPORT_TEL = "1-800-786-648";

export default function BenefitsPage() {
  const { plan, member } = useMember();
  const [open, setOpen] = useState<string | null>("deductible");

  const remainingDed = Math.max(0, plan.deductible - plan.deductibleMet);
  const remainingOop = Math.max(0, plan.oopMax - plan.oopMet);

  const items: { key: string; title: string; icon: string; body: React.ReactNode }[] = [
    {
      key: "deductible", title: "Deductible", icon: "🎯",
      body: (
        <>
          The amount you pay for covered services before your plan starts sharing costs. Your deductible is{" "}
          <b>{usd(plan.deductible)}</b>. You&apos;ve met <b>{usd(plan.deductibleMet)}</b> so far, with{" "}
          <b>{usd(remainingDed)}</b> to go this year.
        </>
      ),
    },
    {
      key: "copay", title: "Copay", icon: "💵",
      body: (
        <>
          A fixed amount you pay for a visit. On your plan: <b>${plan.pcpCopay}</b> for primary care,{" "}
          <b>${plan.specialistCopay}</b> for a specialist, <b>${plan.urgentCopay}</b> at urgent care,{" "}
          <b>${plan.virtualCopay}</b> for a virtual visit, and <b>${plan.rxCopay}</b> for most prescriptions.
        </>
      ),
    },
    {
      key: "coinsurance", title: "Coinsurance", icon: "📊",
      body: (
        <>
          After you meet your deductible, you pay a percentage of covered costs and your plan pays the rest.
          Your coinsurance is <b>{plan.coinsurance}%</b> — so the plan covers the other {100 - plan.coinsurance}%.
        </>
      ),
    },
    {
      key: "oop", title: "Out-of-Pocket Maximum", icon: "🛡️",
      body: (
        <>
          The most you&apos;ll pay in a year for covered in-network care. Once you hit{" "}
          <b>{usd(plan.oopMax)}</b>, your plan pays 100%. You&apos;ve paid <b>{usd(plan.oopMet)}</b>,{" "}
          leaving <b>{usd(remainingOop)}</b> before full coverage kicks in.
        </>
      ),
    },
    {
      key: "covered", title: "Covered Services", icon: "✅",
      body: (
        <>
          Your plan covers doctor visits, specialists, urgent care, lab tests, imaging, prescriptions,
          mental health, and hospital care. Copays and coinsurance apply as shown above. Always use
          in-network providers to keep your costs lowest.
        </>
      ),
    },
    {
      key: "preventive", title: "Preventive Care", icon: "🌱",
      body: (
        <>
          Preventive services — annual wellness visits, recommended screenings, and immunizations — are
          covered at <b>100%</b> with no copay when you see an in-network provider. Staying up to date
          costs you nothing.
        </>
      ),
    },
    {
      key: "emergency", title: "Emergency Coverage", icon: "🚨",
      body: (
        <>
          For a true emergency, go to the nearest ER or call 911 — you&apos;re covered even out of network.
          Your ER copay is <b>${plan.erCopay}</b>, then coinsurance applies. For non-emergencies, urgent
          care or a virtual visit will save you money.
        </>
      ),
    },
  ];

  return (
    <>
      <h1 className="page-title">Plan benefits</h1>
      <p className="page-sub">{member.plan} · Member ID {member.memberId}</p>

      <div className="mp-grid" style={{ gap: 12 }}>
        {items.map((it) => {
          const isOpen = open === it.key;
          return (
            <div key={it.key} className="mp-card" style={{ padding: 0 }}>
              <button
                onClick={() => setOpen(isOpen ? null : it.key)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "16px 20px", background: "transparent", border: 0,
                  cursor: "pointer", textAlign: "left", font: "inherit",
                }}
              >
                <span style={{ fontSize: 22 }}>{it.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>{it.title}</span>
                <span style={{ color: "var(--muted)" }}>{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <div style={{ padding: "0 20px 18px 54px", fontSize: 14.5, lineHeight: 1.6 }}>
                  {it.body}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="help-cta" style={{ marginTop: 22 }}>
        <div style={{ fontSize: 34 }}>📞</div>
        <div style={{ flex: 1 }}>
          <b>Still have questions about your coverage?</b>
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Our member support team is happy to explain any benefit.
          </div>
        </div>
        <a href={`tel:${SUPPORT_TEL}`} className="mp-btn primary">Call Customer Support</a>
      </div>
    </>
  );
}
