import type { CareRecommendation, CareSetting, Plan } from "./types";

/** Symptom catalogue shown as quick-pick tiles on the Care Guidance page. */
export const SYMPTOMS: { key: string; label: string; icon: string }[] = [
  { key: "fever", label: "Fever", icon: "thermometer" },
  { key: "cold", label: "Cold / Flu", icon: "droplet" },
  { key: "headache", label: "Headache", icon: "pulse" },
  { key: "back_pain", label: "Back Pain", icon: "pulse" },
  { key: "stomach_pain", label: "Stomach Pain", icon: "pulse" },
  { key: "rash", label: "Rash", icon: "bandage" },
  { key: "injury", label: "Injury", icon: "bandage" },
  { key: "medication_refill", label: "Medication Refill", icon: "pill" },
  { key: "sore_throat", label: "Sore Throat", icon: "pulse" },
  { key: "pink_eye", label: "Pink Eye", icon: "eye" },
  { key: "chest_pain", label: "Chest Pain", icon: "heart" },
  { key: "breathing", label: "Trouble Breathing", icon: "pulse" },
];

type Rule = Omit<CareRecommendation, "symptom" | "costLabel"> & { match: string[] };

const RULES: Record<string, Rule> = {
  chest_pain: {
    setting: "Emergency Department", emergency: true, telehealthOK: false, followUp: false,
    cost: "$$$$", wait: "Seen immediately", specialties: [],
    why: "Chest pain can signal a heart emergency. Call 911 or go to the nearest Emergency Department right away — do not drive yourself if symptoms are severe.",
    match: ["chest", "heart"],
  },
  breathing: {
    setting: "Emergency Department", emergency: true, telehealthOK: false, followUp: false,
    cost: "$$$$", wait: "Seen immediately", specialties: [],
    why: "Difficulty breathing is a medical emergency. Call 911 or go to the nearest Emergency Department immediately.",
    match: ["breath", "breathing", "choke", "shortness"],
  },
  severe_injury: {
    setting: "Emergency Department", emergency: true, telehealthOK: false, followUp: false,
    cost: "$$$$", wait: "Seen immediately", specialties: [],
    why: "Severe injuries, heavy bleeding, or a possible broken bone should be treated at the Emergency Department.",
    match: ["severe", "bleeding", "broken", "fracture", "head injury", "unconscious"],
  },
  injury: {
    setting: "Urgent Care", emergency: false, telehealthOK: false, followUp: true,
    cost: "$$", wait: "~30–45 min", specialties: ["Urgent Care", "Orthopedic Surgery", "Family Medicine"],
    why: "Minor injuries like sprains, small cuts, or minor burns can be treated quickly at Urgent Care — no need for the ED, and it costs far less.",
    match: ["injury", "sprain", "cut", "burn", "twist"],
  },
  stomach_pain: {
    setting: "Urgent Care", emergency: false, telehealthOK: false, followUp: true,
    cost: "$$", wait: "~30–45 min", specialties: ["Urgent Care", "Family Medicine", "Internal Medicine"],
    why: "Moderate stomach pain that isn't easing is best evaluated at Urgent Care, which can run basic tests. Go to the ED for severe or sudden intense pain.",
    match: ["stomach", "abdomen", "abdominal", "nausea", "vomit"],
  },
  back_pain: {
    setting: "Primary Care Physician", emergency: false, telehealthOK: true, followUp: true,
    cost: "$$", wait: "1–3 days", specialties: ["Family Medicine", "Internal Medicine", "Orthopedic Surgery"],
    why: "Most back pain improves with primary-care guidance and physical therapy. Your PCP can rule out red flags and refer you if needed — a much lower-cost path than the ED.",
    match: ["back", "spine", "neck"],
  },
  fever: {
    setting: "Primary Care Physician", emergency: false, telehealthOK: true, followUp: true,
    cost: "$", wait: "Same / next day", specialties: ["Family Medicine", "Internal Medicine"],
    why: "A fever without emergency warning signs is usually well managed by your PCP or a quick virtual visit. Seek the ED only for very high fever with confusion, stiff neck, or trouble breathing.",
    match: ["fever", "temperature", "chills"],
  },
  cold: {
    setting: "Virtual Consultation", emergency: false, telehealthOK: true, followUp: false,
    cost: "$", wait: "~15 min", specialties: ["Family Medicine", "Internal Medicine"],
    why: "Cold and flu symptoms are ideal for a virtual visit — a clinician can advise on care and prescribe if needed, without a trip to the office.",
    match: ["cold", "flu", "cough", "congestion", "runny"],
  },
  sore_throat: {
    setting: "Virtual Consultation", emergency: false, telehealthOK: true, followUp: false,
    cost: "$", wait: "~15 min", specialties: ["Family Medicine", "Internal Medicine"],
    why: "A sore throat can usually be assessed by video. Your provider can order a strep test locally if needed.",
    match: ["throat", "sore throat", "swallow"],
  },
  headache: {
    setting: "Virtual Consultation", emergency: false, telehealthOK: true, followUp: false,
    cost: "$", wait: "~15 min", specialties: ["Family Medicine", "Internal Medicine"],
    why: "Most headaches can be handled with a virtual visit. Go to the ED for a sudden 'worst headache of your life,' or with confusion or weakness.",
    match: ["headache", "migraine"],
  },
  rash: {
    setting: "Virtual Consultation", emergency: false, telehealthOK: true, followUp: false,
    cost: "$", wait: "~15 min", specialties: ["Family Medicine", "Internal Medicine"],
    why: "A photo-based virtual visit is a fast, low-cost way to evaluate most rashes and get a prescription if needed.",
    match: ["rash", "skin", "itch", "hives"],
  },
  pink_eye: {
    setting: "Virtual Consultation", emergency: false, telehealthOK: true, followUp: false,
    cost: "$", wait: "~15 min", specialties: ["Family Medicine", "Internal Medicine"],
    why: "Pink eye is commonly diagnosed and treated over video — no in-person visit required.",
    match: ["eye", "pink eye", "conjunctivitis"],
  },
  medication_refill: {
    setting: "Virtual Consultation", emergency: false, telehealthOK: true, followUp: false,
    cost: "$", wait: "~15 min", specialties: ["Family Medicine", "Internal Medicine"],
    why: "Routine medication refills can be handled with a quick virtual visit or a message to your PCP — the lowest-cost option.",
    match: ["refill", "medication", "prescription", "renew"],
  },
};

const FALLBACK: Rule = {
  setting: "Primary Care Physician", emergency: false, telehealthOK: true, followUp: true,
  cost: "$", wait: "Same / next day", specialties: ["Family Medicine", "Internal Medicine"],
  why: "For most non-emergency concerns, starting with your primary care physician is the safest and lowest-cost option. They can treat you or refer you to the right specialist.",
  match: [],
};

function costLabel(setting: CareSetting, plan?: Plan): string {
  if (!plan) return "";
  switch (setting) {
    case "Virtual Consultation": return `$${plan.virtualCopay} copay`;
    case "Primary Care Physician": return `$${plan.pcpCopay} copay`;
    case "Urgent Care": return `$${plan.urgentCopay} copay`;
    case "Emergency Department": return `$${plan.erCopay}+ copay, then ${plan.coinsurance}% coinsurance`;
  }
}

/** Rule-based (no AI) care-setting recommendation. Accepts a symptom key or free text. */
export function recommend(input: string, plan?: Plan): CareRecommendation {
  const raw = input.trim().toLowerCase();
  let rule: Rule | undefined = RULES[raw];
  let symptomLabel = input;
  if (!rule) {
    // keyword scan over all rules (emergency rules first for safety)
    const order = ["chest_pain", "breathing", "severe_injury", ...Object.keys(RULES)];
    for (const key of order) {
      const r = RULES[key];
      if (r && r.match.some((m) => raw.includes(m))) { rule = r; break; }
    }
  }
  const found = SYMPTOMS.find((s) => s.key === raw || s.label.toLowerCase() === raw);
  if (found) symptomLabel = found.label;
  const r = rule ?? FALLBACK;
  return {
    symptom: symptomLabel || "your symptoms",
    setting: r.setting,
    why: r.why,
    cost: r.cost,
    costLabel: costLabel(r.setting, plan),
    wait: r.wait,
    telehealthOK: r.telehealthOK,
    emergency: r.emergency,
    followUp: r.followUp,
    specialties: r.specialties,
  };
}
