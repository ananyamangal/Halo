export interface Provider {
  id: string;
  npi: number;
  name: string;
  type: string;
  specialty: string;
  specialtyCode: string;
  network: string;
  inNetwork: boolean;
  facility: string | null;
  city: string;
  state: string;
  zip: number;
  lat: number;
  lng: number;
  acceptingNew: boolean;
  quality: number;
  panel: number;
  phone: string;
  acceptedInsurance: string[];
  /** derived at runtime */
  distanceMi?: number;
}

export interface MemberInfo {
  id: string;
  name: string;
  memberId: string;
  plan: string;
  planId: string;
  lob: string;
  group: string | null;
  state: string;
  county: string;
  zip: number;
  city: string;
  age: number;
  gender: string;
  pcpNpi: number | null;
  effectiveDate: string;
  homeLat: number;
  homeLng: number;
  email: string;
  phone: string;
  preferredPharmacy?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  commsEmail?: boolean;
  commsSms?: boolean;
  commsPush?: boolean;
}

export interface Plan {
  name: string;
  deductible: number;
  deductibleMet: number;
  oopMax: number;
  oopMet: number;
  pcpCopay: number;
  specialistCopay: number;
  erCopay: number;
  urgentCopay: number;
  virtualCopay: number;
  coinsurance: number;
  rxCopay: number;
}

export type ClaimStatus =
  | "Submitted"
  | "Processing"
  | "Approved"
  | "Paid"
  | "Rejected";

export interface Claim {
  id: string;
  provider: string;
  providerNpi?: number | null;
  service: string;
  category: string;
  serviceDate: string | null;
  network: string;
  billed: number;
  allowed: number;
  insurancePaid: number;
  memberResp: number;
  deductibleApplied: number;
  status: ClaimStatus;
  diagnosis?: string | null;
  uploaded?: boolean;
  fileName?: string;
}

export type AppointmentType = "in-person" | "virtual";

export interface Appointment {
  id: string;
  providerId: string;
  providerName: string;
  specialty: string;
  type: AppointmentType;
  whenIso: string;
  whenLabel: string;
  reason?: string;
  location?: string;
  createdAt: string;
}

export type NotificationKind =
  | "appointment"
  | "confirmation"
  | "claim"
  | "bill"
  | "reminder"
  | "virtual";

export interface MemberNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  dueDate?: string;
  read: boolean;
}

export type CareSetting =
  | "Primary Care Physician"
  | "Urgent Care"
  | "Emergency Department"
  | "Virtual Consultation";

export interface CareRecommendation {
  symptom: string;
  setting: CareSetting;
  why: string;
  cost: "$" | "$$" | "$$$" | "$$$$";
  costLabel: string;
  wait: string;
  telehealthOK: boolean;
  emergency: boolean;
  followUp: boolean;
  specialties: string[];
}
