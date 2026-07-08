"use client";

import { useState } from "react";
import { useMember } from "@/lib/member/store";
import { dateLabel } from "@/lib/member/format";
import type { MemberInfo } from "@/lib/member/types";

export default function ProfilePage() {
  const { member, updateProfile } = useMember();

  const [email, setEmail] = useState(member.email ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [pharmacy, setPharmacy] = useState(member.preferredPharmacy ?? "");
  const [ecName, setEcName] = useState(member.emergencyContactName ?? "");
  const [ecPhone, setEcPhone] = useState(member.emergencyContactPhone ?? "");
  const [commsEmail, setCommsEmail] = useState(member.commsEmail ?? false);
  const [commsSms, setCommsSms] = useState(member.commsSms ?? false);
  const [commsPush, setCommsPush] = useState(member.commsPush ?? false);

  const save = () => {
    const patch: Partial<MemberInfo> = {
      email,
      phone,
      preferredPharmacy: pharmacy,
      emergencyContactName: ecName,
      emergencyContactPhone: ecPhone,
      commsEmail,
      commsSms,
      commsPush,
    };
    updateProfile(patch);
  };

  return (
    <>
      <h1 className="page-title">Your profile</h1>
      <p className="page-sub">Keep your contact and preference details up to date.</p>

      <div className="mp-grid g2">
        <div className="mp-card">
          <h3>Personal information</h3>
          <div className="card-sub">Some fields are managed by your plan</div>
          <div className="mp-field">
            <label>Full name</label>
            <input className="mp-input" value={member.name} disabled />
          </div>
          <div className="mp-field">
            <label>Email</label>
            <input className="mp-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mp-field">
            <label>Phone</label>
            <input className="mp-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="mp-grid g2">
            <div className="mp-field">
              <label>Age</label>
              <input className="mp-input" value={String(member.age)} disabled />
            </div>
            <div className="mp-field">
              <label>Gender</label>
              <input className="mp-input" value={member.gender} disabled />
            </div>
          </div>
          <div className="mp-field">
            <label>Address</label>
            <input className="mp-input" value={`${member.city}, ${member.state} ${member.zip}`} disabled />
          </div>
        </div>

        <div className="mp-card">
          <h3>Insurance details</h3>
          <div className="card-sub">Read-only</div>
          <div className="mp-field">
            <label>Plan</label>
            <input className="mp-input" value={member.plan} disabled />
          </div>
          <div className="mp-field">
            <label>Member ID</label>
            <input className="mp-input" value={member.memberId} disabled />
          </div>
          <div className="mp-field">
            <label>Group</label>
            <input className="mp-input" value={member.group ?? "—"} disabled />
          </div>
          <div className="mp-field">
            <label>Effective date</label>
            <input className="mp-input" value={dateLabel(member.effectiveDate)} disabled />
          </div>
        </div>

        <div className="mp-card">
          <h3>Preferred pharmacy</h3>
          <div className="card-sub">Where we send your prescriptions</div>
          <div className="mp-field">
            <label>Pharmacy</label>
            <input
              className="mp-input"
              value={pharmacy}
              placeholder="e.g. Riverside Pharmacy, Main St"
              onChange={(e) => setPharmacy(e.target.value)}
            />
          </div>
        </div>

        <div className="mp-card">
          <h3>Emergency contact</h3>
          <div className="card-sub">Who we&apos;ll reach in an emergency</div>
          <div className="mp-field">
            <label>Contact name</label>
            <input className="mp-input" value={ecName} onChange={(e) => setEcName(e.target.value)} />
          </div>
          <div className="mp-field">
            <label>Contact phone</label>
            <input className="mp-input" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="mp-card" style={{ marginTop: 16 }}>
        <h3>Communication preferences</h3>
        <div className="card-sub">How you&apos;d like to hear from us</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 600 }}>
            <input type="checkbox" checked={commsEmail} onChange={(e) => setCommsEmail(e.target.checked)} />
            Email notifications
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 600 }}>
            <input type="checkbox" checked={commsSms} onChange={(e) => setCommsSms(e.target.checked)} />
            SMS text messages
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 600 }}>
            <input type="checkbox" checked={commsPush} onChange={(e) => setCommsPush(e.target.checked)} />
            Push notifications
          </label>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <button className="mp-btn primary" onClick={save}>Save changes</button>
      </div>
    </>
  );
}
