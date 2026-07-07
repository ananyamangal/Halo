// SummitBridge data types + Filters type.

// Claims cols = [mid,lob,state,age_band,cat,avoid,net,month,tclass,ctype,allowed]
export type ClaimRow = [
  string, // 0 mid
  string, // 1 lob
  string, // 2 state
  string, // 3 age_band
  string, // 4 cat
  string, // 5 avoid
  string, // 6 net (Y/N)
  string, // 7 month (YYYY-MM)
  string, // 8 tclass
  string, // 9 ctype
  number, // 10 allowed
];

// mm cols = [mid,lob,state,month,mm,age_band]
export type MmRow = [
  string, // 0 mid
  string, // 1 lob
  string, // 2 state
  string, // 3 month
  number, // 4 mm
  string, // 5 age_band
];

export interface Member {
  id: string;
  lob: string;
  state: string;
  county: string;
  age: number;
  age_band: string;
  gender: string;
  risk: number;
  pcpq: number;
  mm: number;
  allowed: number;
  pmpm: number;
  ip_allowed: number;
  ed_allowed: number;
  srx_allowed: number;
  bh: number;
  ed_visits: number;
  ip_visits: number;
  bh_claims: number;
  disenroll: number;
  disenroll_reason: string | null;
  high_cost: number;
}

export interface Benchmark {
  theme?: string;
  ours?: string;
  national?: string;
  source?: string;
  implication?: string;
}

export interface Meta {
  lobs: string[];
  states: string[];
  age_bands: string[];
  cats: string[];
  avoid: string[];
  months: string[];
  tclasses: string[];
  hc_threshold: number;
  hc_count: number;
  period: string;
  cost_metric: string;
}

export interface SBData {
  claims: { cols: string[]; rows: ClaimRow[] };
  mm: { cols: string[]; rows: MmRow[] };
  members: Member[];
  benchmarks: Benchmark[];
  meta: Meta;
}

export interface Filters {
  lob: Set<string>;
  state: Set<string>;
  age: Set<string>;
  cat: Set<string>;
  net: Set<string>;
  months: Set<string>;
  highCost: boolean;
}

export interface Scenario {
  srx: number;
  ed: number;
}

export function emptyFilters(): Filters {
  return {
    lob: new Set(),
    state: new Set(),
    age: new Set(),
    cat: new Set(),
    net: new Set(),
    months: new Set(),
    highCost: false,
  };
}
