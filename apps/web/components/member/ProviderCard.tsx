"use client";

import Link from "next/link";
import type { Provider } from "@/lib/member/types";
import { initials } from "@/lib/member/providers";
import Icon from "@/components/member/Icon";

function Stars({ q }: { q: number }) {
  const full = Math.round(q);
  return (
    <span className="stars" style={{ display: "inline-flex", gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name={i < full ? "starFilled" : "star"} size={13} strokeWidth={1.5} />
      ))}
    </span>
  );
}

export default function ProviderCard({
  provider,
  onBook,
  bookLabel = "Book Appointment",
}: {
  provider: Provider;
  onBook?: (p: Provider) => void;
  bookLabel?: string;
}) {
  const p = provider;
  return (
    <div className="prov-card">
      <div className="prov-head">
        <div className="prov-ava">{initials(p.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="prov-name">{p.name}</div>
          <div className="prov-spec">{p.specialty}</div>
          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {p.inNetwork ? (
              <span className="mp-badge b-green">
                <Icon name="check" size={13} strokeWidth={2.4} /> In-Network
              </span>
            ) : (
              <span className="mp-badge b-red">Out-of-Network</span>
            )}
            {p.acceptingNew ? (
              <span className="mp-badge b-teal">Accepting patients</span>
            ) : (
              <span className="mp-badge b-grey">Not accepting</span>
            )}
          </div>
        </div>
      </div>

      <div className="prov-meta">
        <div>
          <Icon name="pin" size={15} />
          {[p.facility, `${p.city}, ${p.state} ${p.zip}`].filter(Boolean).join(" · ")}
        </div>
        {p.distanceMi != null && (
          <div>
            <Icon name="car" size={15} />
            {p.distanceMi} mi away
          </div>
        )}
        <div>
          <Icon name="phone" size={15} />
          {p.phone}
        </div>
        <div style={{ alignItems: "center" }}>
          <Stars q={p.quality} />
          <span style={{ marginLeft: 6 }}>{p.quality.toFixed(1)} quality score</span>
        </div>
      </div>

      <div className="prov-actions">
        <Link href={`/member/providers/${p.id}`} className="mp-btn outline sm">
          View profile
        </Link>
        {onBook && (
          <button
            className="mp-btn primary sm"
            style={{ flex: 1 }}
            onClick={() => onBook(p)}
          >
            {bookLabel}
          </button>
        )}
      </div>
    </div>
  );
}
