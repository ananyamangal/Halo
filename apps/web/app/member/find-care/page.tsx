"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMember } from "@/lib/member/store";
import { SYMPTOMS, recommend } from "@/lib/member/care-rules";
import { withDistance, filterProviders, specialties, states } from "@/lib/member/providers";
import type { CareRecommendation, Provider } from "@/lib/member/types";
import ProviderCard from "@/components/member/ProviderCard";
import BookingModal from "@/components/member/BookingModal";

const SUPPORT_TEL = "1-800-786-648";

function recoClass(setting: CareRecommendation["setting"]): string {
  switch (setting) {
    case "Primary Care Physician": return "pcp";
    case "Urgent Care": return "urgent";
    case "Emergency Department": return "ed";
    case "Virtual Consultation": return "virtual";
  }
}

export default function FindCarePage() {
  const { providers, member, plan, addFollowUp } = useMember();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [rec, setRec] = useState<CareRecommendation | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const followedFor = useRef<string | null>(null);

  // filter controls (same as providers page)
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [state, setState] = useState("All");
  const [zip, setZip] = useState("");
  const [maxDistance, setMaxDistance] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);

  const withDist = useMemo(
    () => withDistance(providers, member.homeLat, member.homeLng),
    [providers, member.homeLat, member.homeLng],
  );
  const specialtyOptions = useMemo(() => specialties(providers), [providers]);
  const stateOptions = useMemo(() => states(providers), [providers]);

  const runRecommendation = (input: string, key: string | null) => {
    const r = recommend(input, plan);
    setSelectedKey(key);
    setRec(r);
  };

  // fire follow-up exactly once per recommendation
  useEffect(() => {
    if (!rec) return;
    const identity = rec.symptom + "|" + rec.setting;
    if (rec.followUp && followedFor.current !== identity) {
      followedFor.current = identity;
      addFollowUp(rec.setting);
    }
  }, [rec, addFollowUp]);

  const nearby = useMemo(() => {
    if (!rec || rec.emergency) return [];
    const base = filterProviders(withDist, { inNetworkOnly: true, specialties: rec.specialties });
    const scoped = base.length ? base : filterProviders(withDist, { inNetworkOnly: true });
    return filterProviders(scoped, {
      q: q || undefined,
      specialty,
      state,
      zip: zip || undefined,
      maxDistance: maxDistance || undefined,
      availableOnly,
    });
  }, [rec, withDist, q, specialty, state, zip, maxDistance, availableOnly]);

  const bookType = rec?.setting === "Virtual Consultation" ? "virtual" : "in-person";

  return (
    <>
      <h1 className="page-title">Where should I go for care?</h1>
      <p className="page-sub">
        Tell us what&apos;s going on and we&apos;ll point you to the right, lowest-cost care setting.
      </p>

      <div className="mp-card">
        <h3>Pick a symptom</h3>
        <div className="card-sub">Or describe it in your own words below</div>
        <div className="symptom-grid">
          {SYMPTOMS.map((s) => (
            <button
              key={s.key}
              className={"symptom" + (selectedKey === s.key ? " sel" : "")}
              onClick={() => { setText(""); runRecommendation(s.key, s.key); }}
            >
              <span className="sy-ic">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        <div className="filter-bar" style={{ marginTop: 18 }}>
          <div className="mp-field" style={{ flex: 1 }}>
            <label>Describe your symptom</label>
            <input
              className="mp-input"
              value={text}
              placeholder="e.g. sharp pain in my lower back for 3 days"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) runRecommendation(text, null); }}
            />
          </div>
          <button
            className="mp-btn primary"
            disabled={!text.trim()}
            onClick={() => runRecommendation(text, null)}
          >
            Get guidance
          </button>
        </div>
      </div>

      {rec && (
        <>
          <div className={"reco " + recoClass(rec.setting)} style={{ marginTop: 18 }}>
            <div className="reco-tag">Recommended care</div>
            <div className="reco-title">{rec.setting}</div>
            <div className="reco-why">{rec.why}</div>
            <div className="reco-facts">
              <div>
                <div className="rf-k">Estimated cost</div>
                <div className="rf-v">{rec.cost} {rec.costLabel}</div>
              </div>
              <div>
                <div className="rf-k">Typical wait</div>
                <div className="rf-v">{rec.wait}</div>
              </div>
              <div>
                <div className="rf-k">Telehealth</div>
                <div className="rf-v">{rec.telehealthOK ? "Yes" : "No"}</div>
              </div>
            </div>
          </div>

          {rec.emergency ? (
            <div className="mp-card" style={{ marginTop: 16, borderColor: "var(--red)", background: "#fdeaea" }}>
              <h3 style={{ color: "var(--red)" }}>🚨 Call 911 or go to the nearest Emergency Department</h3>
              <p style={{ margin: "6px 0 0", color: "var(--ink)" }}>
                In an emergency, don&apos;t wait and don&apos;t book an appointment. Get help immediately —
                call 911 or head to the closest ED now.
              </p>
            </div>
          ) : (
            <>
              <div className="section-h">Nearby in-network providers</div>

              <div className="mp-card" style={{ marginBottom: 14 }}>
                <div className="filter-bar">
                  <div className="mp-field" style={{ flex: 1, minWidth: 200 }}>
                    <label>Search</label>
                    <input className="mp-input" value={q} placeholder="Name, specialty, or city"
                      onChange={(e) => setQ(e.target.value)} />
                  </div>
                  <div className="mp-field">
                    <label>Specialty</label>
                    <select className="mp-select" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                      <option>All</option>
                      {specialtyOptions.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="mp-field">
                    <label>State</label>
                    <select className="mp-select" value={state} onChange={(e) => setState(e.target.value)}>
                      <option>All</option>
                      {stateOptions.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="mp-field">
                    <label>ZIP</label>
                    <input className="mp-input" value={zip} placeholder="Any"
                      onChange={(e) => setZip(e.target.value)} style={{ maxWidth: 110 }} />
                  </div>
                  <div className="mp-field">
                    <label>Within</label>
                    <select className="mp-select" value={maxDistance}
                      onChange={(e) => setMaxDistance(Number(e.target.value))}>
                      <option value={0}>Any distance</option>
                      <option value={10}>10 mi</option>
                      <option value={25}>25 mi</option>
                      <option value={50}>50 mi</option>
                      <option value={100}>100 mi</option>
                    </select>
                  </div>
                  <div className="mp-field">
                    <label>&nbsp;</label>
                    <label style={{ display: "flex", gap: 7, alignItems: "center", fontWeight: 600 }}>
                      <input type="checkbox" checked={availableOnly}
                        onChange={(e) => setAvailableOnly(e.target.checked)} />
                      Accepting new patients
                    </label>
                  </div>
                </div>
              </div>

              {(rec.setting === "Virtual Consultation" || rec.telehealthOK) && (
                <div className="help-cta" style={{ marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <b>💻 This can likely be handled by video</b>
                    <div style={{ color: "var(--muted)", fontSize: 13.5 }}>
                      Skip the trip — a virtual visit is faster and often cheaper.
                    </div>
                  </div>
                  <Link href="/member/virtual-care" className="mp-btn blue">Explore virtual care</Link>
                </div>
              )}

              {nearby.length === 0 ? (
                <div className="empty">
                  <div className="em-ic">🔍</div>
                  <p>No in-network providers match your filters. Try widening your search.</p>
                </div>
              ) : (
                <div className="prov-grid">
                  {nearby.map((p) => (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      bookLabel={bookType === "virtual" ? "Book Virtual Visit" : "Book Appointment"}
                      onBook={(prov) => setSelectedProvider(prov)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Feature 2 — benefits help */}
      <div className="help-cta" style={{ marginTop: 24 }}>
        <div style={{ fontSize: 34 }}>🛡️</div>
        <div style={{ flex: 1 }}>
          <b>Need help understanding your benefits?</b>
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Our team can walk you through copays, deductibles, and what&apos;s covered.
          </div>
        </div>
        <a href={`tel:${SUPPORT_TEL}`} className="mp-btn primary">📞 Call Customer Support</a>
        <Link href="/member/benefits" className="mp-btn outline">View Plan Benefits</Link>
      </div>

      {selectedProvider && (
        <BookingModal
          provider={selectedProvider}
          type={bookType}
          onClose={() => setSelectedProvider(null)}
        />
      )}
    </>
  );
}
