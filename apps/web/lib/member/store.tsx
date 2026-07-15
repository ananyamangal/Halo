"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import type {
  Appointment, Claim, CareRecommendation, MemberInfo, MemberNotification, Plan, Provider,
} from "./types";
import { usd } from "./format";

const LS_KEY = "sbh_member_state_v1";
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

interface Persisted {
  seeded: boolean;
  appts: Appointment[];
  extraClaims: Claim[];
  notifs: MemberNotification[];
  profilePatch: Partial<MemberInfo>;
  planPatch: Partial<Plan>;
}
const DEFAULT: Persisted = { seeded: false, appts: [], extraClaims: [], notifs: [], profilePatch: {}, planPatch: {} };

export interface CoverageSummary {
  total: number; insurancePaid: number; memberResp: number; deductibleApplied: number;
}

interface Ctx {
  loaded: boolean;
  providers: Provider[];
  member: MemberInfo;
  plan: Plan;
  claims: Claim[];
  appointments: Appointment[];
  upcoming: Appointment[];
  notifications: MemberNotification[];
  unread: number;
  bookAppointment: (p: { providerId: string; providerName: string; specialty: string; type: Appointment["type"]; whenIso: string; whenLabel: string; reason?: string; location?: string }) => void;
  addFollowUp: (setting: string) => void;
  uploadBill: (p: { fileName: string; amount: number; providerName?: string; category?: string }) => CoverageSummary;
  markRead: (id: string) => void;
  markAllRead: () => void;
  updateProfile: (patch: Partial<MemberInfo>) => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const MemberCtx = createContext<Ctx | null>(null);
export const useMember = () => {
  const c = useContext(MemberCtx);
  if (!c) throw new Error("useMember must be used inside <MemberProvider>");
  return c;
};

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [baseMember, setBaseMember] = useState<MemberInfo | null>(null);
  const [basePlan, setBasePlan] = useState<Plan | null>(null);
  const [baseClaims, setBaseClaims] = useState<Claim[]>([]);
  const [st, setSt] = useState<Persisted>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load base data + persisted user state
  useEffect(() => {
    let alive = true;
    const persisted: Persisted = (() => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
      } catch { return DEFAULT; }
    })();
    Promise.all([
      fetch("/providers.json").then((r) => r.json()),
      fetch("/member.json").then((r) => r.json()),
    ]).then(([prov, mem]: [Provider[], { member: MemberInfo; plan: Plan; claims: Claim[] }]) => {
      if (!alive) return;
      setProviders(prov);
      setBaseMember(mem.member);
      setBasePlan(mem.plan);
      setBaseClaims(mem.claims);
      if (!persisted.seeded) {
        const now = new Date().toISOString();
        persisted.notifs = [
          { id: uid(), kind: "reminder", title: "Welcome to your member portal", body: "Find care, book visits, upload bills and track claims — all in one place.", createdAt: now, read: false },
          { id: uid(), kind: "reminder", title: "Preventive care reminder", body: "Your annual wellness visit is covered 100%. Book with your PCP to stay ahead.", createdAt: now, read: false },
          { id: uid(), kind: "claim", title: "Claim update", body: `A recent ${mem.claims[0]?.service ?? "visit"} claim was processed. View details in Claims.`, createdAt: now, read: false },
        ];
        persisted.seeded = true;
      }
      setSt(persisted);
      setLoaded(true);
    }).catch(() => setLoaded(true));
    return () => { alive = false; };
  }, []);

  // persist
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch { /* ignore */ }
  }, [st, loaded]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const member = useMemo(() => ({ ...(baseMember as MemberInfo), ...st.profilePatch }), [baseMember, st.profilePatch]);
  const plan = useMemo(() => ({ ...(basePlan as Plan), ...st.planPatch }), [basePlan, st.planPatch]);
  const claims = useMemo(
    () => [...st.extraClaims, ...baseClaims].sort((a, b) => (b.serviceDate ?? "").localeCompare(a.serviceDate ?? "")),
    [st.extraClaims, baseClaims],
  );
  const appointments = useMemo(
    () => [...st.appts].sort((a, b) => a.whenIso.localeCompare(b.whenIso)),
    [st.appts],
  );
  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return appointments.filter((a) => a.whenIso.slice(0, 10) >= today);
  }, [appointments]);
  const notifications = useMemo(
    () => [...st.notifs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [st.notifs],
  );
  const unread = notifications.filter((n) => !n.read).length;

  const pushNotif = useCallback((n: Omit<MemberNotification, "id" | "createdAt" | "read">) => {
    setSt((s) => ({ ...s, notifs: [{ ...n, id: uid(), createdAt: new Date().toISOString(), read: false }, ...s.notifs] }));
  }, []);

  const bookAppointment: Ctx["bookAppointment"] = useCallback((p) => {
    const appt: Appointment = { id: uid(), createdAt: new Date().toISOString(), ...p };
    setSt((s) => ({ ...s, appts: [...s.appts, appt] }));
    pushNotif({
      kind: p.type === "virtual" ? "virtual" : "confirmation",
      title: p.type === "virtual" ? "Virtual visit booked" : "Appointment confirmed",
      body: `${p.type === "virtual" ? "Video visit" : "Visit"} with ${p.providerName} · ${p.whenLabel}.`,
    });
    toast(`${p.type === "virtual" ? "Virtual visit" : "Appointment"} booked with ${p.providerName}`);
  }, [pushNotif, toast]);

  const addFollowUp: Ctx["addFollowUp"] = useCallback((setting) => {
    const due = new Date(); due.setDate(due.getDate() + 7);
    pushNotif({
      kind: "reminder",
      title: "7-day follow-up reminder",
      body: `Check in on how you're feeling after your ${setting} visit. Book a follow-up if symptoms persist.`,
      dueDate: due.toISOString(),
    });
  }, [pushNotif]);

  const uploadBill: Ctx["uploadBill"] = useCallback((p) => {
    // compute coverage against the CURRENT plan snapshot
    const pl = { ...(basePlan as Plan), ...st.planPatch };
    const remainingDed = Math.max(0, pl.deductible - pl.deductibleMet);
    const dedApplied = Math.min(p.amount, remainingDed);
    const afterDed = p.amount - dedApplied;
    let memberResp = dedApplied + afterDed * (pl.coinsurance / 100);
    const remainingOop = Math.max(0, pl.oopMax - pl.oopMet);
    memberResp = Math.min(memberResp, remainingOop);
    const insurancePaid = Math.max(0, p.amount - memberResp);
    const summary: CoverageSummary = {
      total: p.amount,
      insurancePaid: Math.round(insurancePaid),
      memberResp: Math.round(memberResp),
      deductibleApplied: Math.round(dedApplied),
    };
    const claim: Claim = {
      id: "UPL-" + uid().toUpperCase().slice(0, 6),
      provider: p.providerName || "Uploaded bill",
      service: "Uploaded medical bill",
      category: p.category || "Uploaded",
      serviceDate: new Date().toISOString().slice(0, 10),
      network: "In-Network",
      billed: p.amount,
      allowed: p.amount,
      insurancePaid: summary.insurancePaid,
      memberResp: summary.memberResp,
      deductibleApplied: summary.deductibleApplied,
      status: "Processing",
      uploaded: true,
      fileName: p.fileName,
    };
    setSt((s) => {
      const pl2 = { ...(basePlan as Plan), ...s.planPatch };
      return {
        ...s,
        extraClaims: [claim, ...s.extraClaims],
        planPatch: {
          ...s.planPatch,
          deductibleMet: Math.min(pl2.deductible, pl2.deductibleMet + summary.deductibleApplied),
          oopMet: Math.min(pl2.oopMax, pl2.oopMet + summary.memberResp),
        },
        notifs: [{
          id: uid(), kind: "bill", read: false, createdAt: new Date().toISOString(),
          title: "Bill received — processing",
          body: `We received ${p.fileName}. Estimated your responsibility: ${usd(summary.memberResp)} · plan pays ${usd(summary.insurancePaid)}.`,
        }, ...s.notifs],
      };
    });
    toast("Bill uploaded — added to your claims");
    return summary;
  }, [basePlan, st.planPatch, toast]);

  const markRead = useCallback((id: string) => {
    setSt((s) => ({ ...s, notifs: s.notifs.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  }, []);
  const markAllRead = useCallback(() => {
    setSt((s) => ({ ...s, notifs: s.notifs.map((n) => ({ ...n, read: true })) }));
  }, []);
  const updateProfile = useCallback((patch: Partial<MemberInfo>) => {
    setSt((s) => ({ ...s, profilePatch: { ...s.profilePatch, ...patch } }));
    toast("Profile updated");
  }, [toast]);

  const ready = loaded && !!baseMember && !!basePlan;
  const value: Ctx = {
    loaded: ready, providers, member, plan, claims, appointments, upcoming,
    notifications, unread, bookAppointment, addFollowUp, uploadBill, markRead,
    markAllRead, updateProfile, toast, toastMsg,
  };

  return <MemberCtx.Provider value={value}>{children}</MemberCtx.Provider>;
}

/** helper so pages can turn a recommendation into a follow-up if needed */
export function shouldFollowUp(r: CareRecommendation): boolean {
  return r.followUp;
}
