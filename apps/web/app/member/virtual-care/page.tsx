"use client";

import { useMemo, useState } from "react";
import { useMember } from "@/lib/member/store";
import { withDistance, filterProviders } from "@/lib/member/providers";
import type { Provider } from "@/lib/member/types";
import ProviderCard from "@/components/member/ProviderCard";
import BookingModal from "@/components/member/BookingModal";
import Icon from "@/components/member/Icon";

const TELEHEALTH_SPECIALTIES = ["Family Medicine", "Internal Medicine", "Urgent Care"];

export default function VirtualCarePage() {
  const { providers, member, plan } = useMember();
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const telehealthProviders = useMemo(() => {
    const withDist = withDistance(providers, member.homeLat, member.homeLng);
    const inNet = filterProviders(withDist, { inNetworkOnly: true });
    return inNet.filter((p) =>
      TELEHEALTH_SPECIALTIES.some((s) => p.specialty.includes(s)),
    );
  }, [providers, member.homeLat, member.homeLng]);

  return (
    <>
      <h1 className="page-title">Virtual consultation available</h1>
      <p className="page-sub">See a clinician by video — no waiting room required.</p>

      <div className="reco virtual" style={{ marginBottom: 18 }}>
        <div className="reco-tag">Why virtual</div>
        <div className="reco-title">Care in about 15 minutes</div>
        <div className="reco-why">
          Virtual visits cut wait times and cost. Great for colds, rashes, refills, and quick questions —
          your provider can prescribe and refer just like an in-person visit.
        </div>
        <div className="reco-facts">
          <div>
            <div className="rf-k">Your copay</div>
            <div className="rf-v">${plan.virtualCopay}</div>
          </div>
          <div>
            <div className="rf-k">Typical wait</div>
            <div className="rf-v">~15 min</div>
          </div>
          <div>
            <div className="rf-k">Available</div>
            <div className="rf-v">{telehealthProviders.length} clinicians</div>
          </div>
        </div>
      </div>

      <div className="section-h">Book a virtual visit</div>

      {telehealthProviders.length === 0 ? (
        <div className="empty">
          <div className="em-ic"><Icon name="monitor" size={30} /></div>
          <p>No telehealth-capable in-network providers are available right now.</p>
        </div>
      ) : (
        <div className="prov-grid">
          {telehealthProviders.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              bookLabel="Book Virtual Visit"
              onBook={(prov) => setSelectedProvider(prov)}
            />
          ))}
        </div>
      )}

      {selectedProvider && (
        <BookingModal provider={selectedProvider} type="virtual" onClose={() => setSelectedProvider(null)} />
      )}
    </>
  );
}
