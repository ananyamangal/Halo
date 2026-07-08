import type { Provider } from "./types";

const R = 3958.8; // earth radius miles
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function withDistance(providers: Provider[], lat: number, lng: number): Provider[] {
  return providers
    .map((p) => ({ ...p, distanceMi: Math.round(haversine(lat, lng, p.lat, p.lng) * 10) / 10 }))
    .sort((a, b) => (a.distanceMi ?? 0) - (b.distanceMi ?? 0));
}

export interface ProviderFilters {
  q?: string;
  specialty?: string;
  state?: string;
  zip?: string;
  maxDistance?: number;
  availableOnly?: boolean;
  inNetworkOnly?: boolean;
  specialties?: string[]; // restrict to a set (used by care guidance)
}

export function filterProviders(providers: Provider[], f: ProviderFilters): Provider[] {
  return providers.filter((p) => {
    if (f.q) {
      const q = f.q.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.specialty.toLowerCase().includes(q) &&
        !p.city.toLowerCase().includes(q)
      )
        return false;
    }
    if (f.specialty && f.specialty !== "All" && p.specialty !== f.specialty) return false;
    if (f.specialties && f.specialties.length && !f.specialties.includes(p.specialty)) return false;
    if (f.state && f.state !== "All" && p.state !== f.state) return false;
    if (f.zip && String(p.zip) !== f.zip.trim()) return false;
    if (f.maxDistance && (p.distanceMi ?? 0) > f.maxDistance) return false;
    if (f.availableOnly && !p.acceptingNew) return false;
    if (f.inNetworkOnly && !p.inNetwork) return false;
    return true;
  });
}

export function specialties(providers: Provider[]): string[] {
  return Array.from(new Set(providers.map((p) => p.specialty))).sort();
}
export function states(providers: Provider[]): string[] {
  return Array.from(new Set(providers.map((p) => p.state))).sort();
}

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TIMES = ["8:30 AM", "9:15 AM", "10:00 AM", "11:30 AM", "1:00 PM", "2:45 PM", "4:15 PM"];

/** Deterministic-ish upcoming slots seeded by provider id, relative to today. */
export function generateSlots(
  seed: string,
  opts: { count?: number; virtual?: boolean } = {},
): { iso: string; label: string }[] {
  const count = opts.count ?? 6;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: { iso: string; label: string }[] = [];
  const now = new Date();
  let dayOffset = opts.virtual ? 0 : 1;
  for (let i = 0; i < count; i++) {
    dayOffset += 1 + ((h >> i) & 1);
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
    const t = TIMES[(h + i * 3) % TIMES.length]!;
    out.push({
      iso: d.toISOString().slice(0, 10) + "T" + t,
      label: `${DAY[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()} · ${t}`,
    });
  }
  return out;
}

export function initials(name: string): string {
  const clean = name.replace(/^Dr\.?\s+/i, "");
  const parts = clean.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
