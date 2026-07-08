"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMember } from "@/lib/member/store";
import { withDistance, generateSlots, initials } from "@/lib/member/providers";
import type { AppointmentType } from "@/lib/member/types";
import BookingModal from "@/components/member/BookingModal";

function stars(q: number) {
  const full = Math.round(q);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

export default function ProviderProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { providers, member } = useMember();
  const [modalType, setModalType] = useState<AppointmentType | null>(null);

  const provider = useMemo(() => {
    const withDist = withDistance(providers, member.homeLat, member.homeLng);
    return withDist.find((p) => p.id === id);
  }, [providers, member.homeLat, member.homeLng, id]);

  const slots = useMemo(
    () => (provider ? generateSlots(provider.id, { count: 6 }) : []),
    [provider],
  );

  if (!provider) {
    return (
      <>
        <Link href="/member/providers" className="mp-btn ghost sm">← Back to providers</Link>
        <div className="empty">
          <div className="em-ic">🤷</div>
          <p>We couldn&apos;t find that provider.</p>
          <Link href="/member/providers" className="mp-btn primary sm">Browse providers</Link>
        </div>
      </>
    );
  }

  const p = provider;
  const address = [p.facility, `${p.city}, ${p.state} ${p.zip}`].filter(Boolean).join(" · ");

  return (
    <>
      <Link href="/member/providers" className="mp-btn ghost sm" style={{ marginBottom: 12 }}>
        ← Back to providers
      </Link>

      <div className="mp-card">
        <div className="prov-head">
          <div className="prov-ava" style={{ width: 64, height: 64, fontSize: 22 }}>{initials(p.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="prov-name" style={{ fontSize: 20 }}>{p.name}</div>
            <div className="prov-spec" style={{ fontSize: 14 }}>{p.specialty} · {p.type}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {p.inNetwork
                ? <span className="mp-badge b-green">✓ In-Network</span>
                : <span className="mp-badge b-red">Out-of-Network</span>}
              {p.acceptingNew
                ? <span className="mp-badge b-teal">Accepting patients</span>
                : <span className="mp-badge b-grey">Not accepting</span>}
              <span className="stars">{stars(p.quality)}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{p.quality.toFixed(1)} quality</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mp-grid g2" style={{ marginTop: 16 }}>
        <div className="mp-card">
          <h3>Contact information</h3>
          <div className="prov-meta" style={{ marginTop: 10 }}>
            <div>📞 {p.phone}</div>
            <div>📍 {address}</div>
            {p.distanceMi != null && <div>🚗 {p.distanceMi} mi from your home</div>}
          </div>
        </div>

        <div className="mp-card">
          <h3>About</h3>
          <div className="prov-meta" style={{ marginTop: 10 }}>
            <div>🏥 Provider type: {p.type}</div>
            <div>👥 Panel size: {p.panel.toLocaleString("en-US")} patients</div>
            <div>⭐ Quality score: {p.quality.toFixed(1)} / 5</div>
            <div>🛡️ Network: {p.network}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Accepted insurance</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {p.acceptedInsurance.length
                ? p.acceptedInsurance.map((ins) => (
                    <span key={ins} className="mp-badge b-blue">{ins}</span>
                  ))
                : <span style={{ color: "var(--muted)", fontSize: 13 }}>Not listed</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="mp-card" style={{ marginTop: 16 }}>
        <h3>Appointment booking</h3>
        <div className="card-sub">Next available times</div>
        <div className="slots">
          {slots.map((s) => (
            <button key={s.iso} className="slot" onClick={() => setModalType("in-person")}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="mp-btn primary" onClick={() => setModalType("in-person")}>
            🩺 Book appointment
          </button>
          <button className="mp-btn blue" onClick={() => setModalType("virtual")}>
            💻 Book virtual visit
          </button>
        </div>
      </div>

      {modalType && (
        <BookingModal provider={p} type={modalType} onClose={() => setModalType(null)} />
      )}
    </>
  );
}
