"use client";

import { useMemo, useState } from "react";
import type { AppointmentType, Provider } from "@/lib/member/types";
import { generateSlots } from "@/lib/member/providers";
import { useMember } from "@/lib/member/store";

export default function BookingModal({
  provider,
  type = "in-person",
  onClose,
}: {
  provider: Provider;
  type?: AppointmentType;
  onClose: () => void;
}) {
  const { bookAppointment } = useMember();
  const slots = useMemo(
    () => generateSlots(provider.id + type, { virtual: type === "virtual", count: 6 }),
    [provider.id, type],
  );
  const [sel, setSel] = useState<number>(0);
  const [reason, setReason] = useState("");

  const confirm = () => {
    const slot = slots[sel];
    if (!slot) return;
    bookAppointment({
      providerId: provider.id,
      providerName: provider.name,
      specialty: provider.specialty,
      type,
      whenIso: slot.iso,
      whenLabel: slot.label,
      reason: reason || undefined,
      location: type === "virtual" ? "Video visit" : `${provider.city}, ${provider.state}`,
    });
    onClose();
  };

  return (
    <div className="mp-overlay" onClick={onClose}>
      <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 2px", fontSize: 19 }}>
          {type === "virtual" ? "Book a virtual visit" : "Book an appointment"}
        </h3>
        <p style={{ color: "var(--muted)", margin: "0 0 16px", fontSize: 13.5 }}>
          {provider.name} · {provider.specialty}
        </p>

        <div className="mp-field">
          <label>Choose a time</label>
          <div className="slots">
            {slots.map((s, i) => (
              <button
                key={s.iso}
                className={"slot" + (i === sel ? " sel" : "")}
                onClick={() => setSel(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mp-field">
          <label>Reason for visit (optional)</label>
          <input
            className="mp-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. persistent cough"
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="mp-btn outline" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button className="mp-btn primary" onClick={confirm} style={{ flex: 2 }}>
            Confirm booking
          </button>
        </div>
      </div>
    </div>
  );
}
