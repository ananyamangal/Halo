"use client";

import { useMemo, useState } from "react";
import { useMember } from "@/lib/member/store";
import { withDistance, filterProviders, specialties, states } from "@/lib/member/providers";
import type { Provider } from "@/lib/member/types";
import ProviderCard from "@/components/member/ProviderCard";
import BookingModal from "@/components/member/BookingModal";

export default function ProvidersPage() {
  const { providers, member } = useMember();

  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [state, setState] = useState("All");
  const [zip, setZip] = useState("");
  const [maxDistance, setMaxDistance] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [inNetworkOnly, setInNetworkOnly] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const withDist = useMemo(
    () => withDistance(providers, member.homeLat, member.homeLng),
    [providers, member.homeLat, member.homeLng],
  );
  const specialtyOptions = useMemo(() => specialties(providers), [providers]);
  const stateOptions = useMemo(() => states(providers), [providers]);

  const results = useMemo(
    () => filterProviders(withDist, {
      q: q || undefined,
      specialty,
      state,
      zip: zip || undefined,
      maxDistance: maxDistance || undefined,
      availableOnly,
      inNetworkOnly,
    }),
    [withDist, q, specialty, state, zip, maxDistance, availableOnly, inNetworkOnly],
  );

  return (
    <>
      <h1 className="page-title">Find a provider</h1>
      <p className="page-sub">Search in-network doctors and facilities near you.</p>

      <div className="mp-card" style={{ marginBottom: 16 }}>
        <div className="filter-bar">
          <div className="mp-field" style={{ flex: 1, minWidth: 220 }}>
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
          <div className="mp-field">
            <label>&nbsp;</label>
            <label style={{ display: "flex", gap: 7, alignItems: "center", fontWeight: 600 }}>
              <input type="checkbox" checked={inNetworkOnly}
                onChange={(e) => setInNetworkOnly(e.target.checked)} />
              In-network only
            </label>
          </div>
        </div>
      </div>

      <div className="section-h">{results.length} provider{results.length === 1 ? "" : "s"} found</div>

      {results.length === 0 ? (
        <div className="empty">
          <div className="em-ic">🔍</div>
          <p>No providers match your filters. Try widening your search.</p>
        </div>
      ) : (
        <div className="prov-grid">
          {results.map((p) => (
            <ProviderCard key={p.id} provider={p} onBook={(prov) => setSelectedProvider(prov)} />
          ))}
        </div>
      )}

      {selectedProvider && (
        <BookingModal provider={selectedProvider} type="in-person" onClose={() => setSelectedProvider(null)} />
      )}
    </>
  );
}
