import type {
  Agent,
  Customer,
  InventoryItem,
  Invoice,
  PaginatedResult,
  PurchaseOrder,
  Supplier,
  TrendPoint,
  Vehicle,
  WorkflowExecution,
  WorkOrder,
} from "@halo/types";
import { ApiError, type TokenEnvelope } from "@/lib/api/http";
import type { AuthUser } from "@/lib/store/auth-store";
import type {
  AnalyticsData,
  AppNotification,
  DashboardData,
  FinanceSummary,
  InventorySummary,
} from "@/lib/api/types";
import { db } from "@/lib/mock/dataset";

/**
 * In-memory mock API. `mockApi` mirrors the live API contract exactly: it routes
 * a path to the in-memory `db`, applies search/filter/sort/pagination for list
 * endpoints, computes the aggregation objects, and mutates the db for POST
 * endpoints — returning the same shapes the FastAPI backend would.
 */

type Params = Record<string, unknown>;
interface Opts {
  method?: string;
  params?: Params;
  body?: unknown;
}

// --- Helpers -----------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v);
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Read a possibly-nested sort value off an object (supports Money.amountMinor). */
function sortValue(obj: unknown, field: string): string | number {
  const v = (obj as Record<string, unknown>)[field];
  if (v && typeof v === "object" && "amountMinor" in (v as object)) {
    return (v as { amountMinor: number }).amountMinor;
  }
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return v === undefined || v === null ? "" : String(v).toLowerCase();
}

interface ListConfig<T> {
  /** Fields searched (case-insensitive substring). */
  searchFields: (item: T) => Array<string | undefined>;
  /** Filter predicates keyed by param name. */
  filters?: Record<string, (item: T, value: string) => boolean>;
}

function paginate<T>(
  source: T[],
  params: Params,
  config: ListConfig<T>,
): PaginatedResult<T> {
  let items = [...source];

  // Search
  const search = str(params.search)?.trim().toLowerCase();
  if (search) {
    items = items.filter((item) =>
      config.searchFields(item).some((f) => f != null && f.toLowerCase().includes(search)),
    );
  }

  // Filters
  if (config.filters) {
    for (const [key, predicate] of Object.entries(config.filters)) {
      const value = str(params[key]);
      if (value === undefined || value === "") continue;
      // Support comma-joined multi-values.
      const values = value.split(",").map((v) => v.trim()).filter(Boolean);
      items = items.filter((item) => values.some((v) => predicate(item, v)));
    }
  }

  // Sort
  const sortField = str(params.sortField);
  const sortDir = str(params.sortDir) === "desc" ? -1 : 1;
  if (sortField) {
    items.sort((a, b) => {
      const av = sortValue(a, sortField);
      const bv = sortValue(b, sortField);
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }

  // Paginate
  const page = Math.max(1, num(params.page, 1));
  const pageSize = Math.max(1, num(params.pageSize, 10));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return { items: pageItems, page, pageSize, total, totalPages };
}

function rupees(m: { amountMinor: number }): number {
  return m.amountMinor / 100;
}

// --- Aggregations ------------------------------------------------------------

function dashboard(): DashboardData {
  const revenueToday = db.invoices
    .filter((i) => i.status === "paid")
    .slice(0, 8)
    .reduce((s, i) => s + rupees(i.amountPaid), 0);

  const occupied = db.bays.filter((b) => b.status === "occupied").length;
  const workshopUtilization = Math.round((occupied / db.bays.length) * 100);

  const healthy = db.inventory.filter((i) => i.health === "healthy").length;
  const inventoryHealthPct = Math.round((healthy / db.inventory.length) * 100);

  const csat = Math.round(
    db.customers.reduce((s, c) => s + c.satisfactionScore, 0) / db.customers.length,
  );

  const today = new Date().toDateString();
  const appointmentsToday = db.appointments.filter(
    (a) => new Date(a.scheduledFor).toDateString() === today,
  ).length;

  const financeAlerts = db.invoices.filter((i) => i.status === "overdue").length;
  const pendingOrders = db.purchaseOrders.filter((p) => p.status === "pending_approval").length;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const revenueTrend: TrendPoint[] = months.map((m, i) => ({ label: m, value: 180000 + i * 24000 + (i % 2) * 18000 }));
  const inventoryForecast: TrendPoint[] = months.map((m, i) => ({ label: m, value: 60 + i * 4 - (i % 3) * 5 }));
  const serviceMix: TrendPoint[] = [
    { label: "Periodic", value: 42 },
    { label: "Brakes", value: 21 },
    { label: "Engine", value: 14 },
    { label: "Electrical", value: 11 },
    { label: "Body", value: 12 },
  ];

  const workshopTimeline = db.bays
    .filter((b) => b.status === "occupied")
    .map((b) => ({
      bay: b.name,
      status: b.jobStatus ?? "in_progress",
      progress: b.progressPct ?? 0,
      eta: b.etaMinutes,
      vehicle: b.vehicleLabel,
    }));

  return {
    revenueToday: Math.round(revenueToday),
    revenueDeltaPct: 12.4,
    workshopUtilization,
    inventoryHealthPct,
    customerSatisfaction: csat,
    appointmentsToday,
    financeAlerts,
    pendingOrders,
    revenueTrend,
    inventoryForecast,
    workshopTimeline,
    serviceMix,
  };
}

function analytics(): AnalyticsData {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const kpis = [
    { label: "Revenue (MTD)", value: "₹24.8L", deltaPct: 12.4 },
    { label: "Avg Turnaround", value: "2.3 days", deltaPct: -8.1 },
    { label: "Bay Utilization", value: "78%", deltaPct: 5.2 },
    { label: "CSAT", value: "91", deltaPct: 3.0 },
  ];
  return {
    kpis,
    revenueByMonth: months.map((m, i) => ({ label: m, value: 1900000 + i * 240000 })),
    turnaroundTrend: months.map((m, i) => ({ label: m, value: round(3.2 - i * 0.15) })),
    technicianProductivity: db.technicians.map((t) => ({
      name: t.name,
      jobs: t.jobsCompletedToday + 12,
      utilization: t.utilizationPct,
    })),
    satisfactionTrend: months.map((m, i) => ({ label: m, value: 85 + i + (i % 2) })),
    forecastAccuracy: months.map((m, i) => ({ label: m, value: 82 + i * 2 })),
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function financeSummary(): FinanceSummary {
  const outstanding = db.invoices
    .filter((i) => i.status !== "paid" && i.status !== "void" && i.status !== "draft")
    .reduce((s, i) => s + (rupees(i.total) - rupees(i.amountPaid)), 0);
  const gstCollected = db.invoices
    .filter((i) => i.status === "paid" || i.status === "partially_paid")
    .reduce((s, i) => s + rupees(i.gstAmount), 0);
  const collectedMtd = db.payments.reduce((s, p) => s + rupees(p.amount), 0);
  const revenueMtd = db.invoices
    .filter((i) => i.status !== "void" && i.status !== "draft")
    .reduce((s, i) => s + rupees(i.total), 0);
  const unreconciled = db.payments.filter((p) => !p.reconciled).length;
  const erpPending = db.invoices.filter((i) => !i.erpSynced && i.status !== "draft" && i.status !== "void").length;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return {
    revenueMtd: Math.round(revenueMtd),
    outstanding: Math.round(outstanding),
    gstCollected: Math.round(gstCollected),
    collectedMtd: Math.round(collectedMtd),
    unreconciled,
    erpPending,
    cashflowTrend: months.map((m, i) => ({ label: m, value: 1600000 + i * 180000 - (i % 2) * 90000 })),
  };
}

function inventorySummary(): InventorySummary {
  const totalValue = db.inventory.reduce((s, i) => s + rupees(i.unitCost) * i.currentStock, 0);
  const deadStockValue = db.inventory
    .filter((i) => i.health === "dead" || i.health === "overstock")
    .reduce((s, i) => s + rupees(i.unitCost) * i.currentStock, 0);
  const fastMovingCount = db.inventory.filter((i) => i.predictedDemand30d >= 60).length;
  const reorderCount = db.inventory.filter((i) => i.health === "critical" || i.health === "low").length;

  // Crude inventory-days: total stock / total daily predicted demand.
  const totalStock = db.inventory.reduce((s, i) => s + i.currentStock, 0);
  const dailyDemand = db.inventory.reduce((s, i) => s + i.predictedDemand30d / 30, 0);
  const inventoryDays = dailyDemand > 0 ? Math.round(totalStock / dailyDemand) : 0;

  const byCat = new Map<string, number>();
  for (const i of db.inventory) {
    byCat.set(i.category, (byCat.get(i.category) ?? 0) + i.predictedDemand30d);
  }
  const categoryConsumption: TrendPoint[] = [...byCat.entries()].map(([label, value]) => ({ label, value }));

  return {
    totalValue: Math.round(totalValue),
    deadStockValue: Math.round(deadStockValue),
    fastMovingCount,
    inventoryDays,
    reorderCount,
    categoryConsumption,
  };
}

// --- List endpoint configs ---------------------------------------------------

const customerList: ListConfig<Customer> = {
  searchFields: (c) => [c.name, c.phone, c.email, c.city],
  filters: { loyaltyTier: (c, v) => c.loyaltyTier === v },
};
const vehicleList: ListConfig<Vehicle> = {
  searchFields: (v) => [v.vin, v.chassisNumber, v.registration, v.make, v.model, v.ownerName],
  filters: { make: (v, val) => v.make === val },
};
const appointmentList: ListConfig<(typeof db.appointments)[number]> = {
  searchFields: (a) => [a.customerName, a.vehicleLabel, a.serviceType, a.advisorName],
  filters: { status: (a, v) => a.status === v },
};
const workOrderList: ListConfig<WorkOrder> = {
  searchFields: (w) => [w.number, w.customerName, w.vehicleLabel, w.technicianName],
  filters: { status: (w, v) => w.status === v },
};
const inventoryList: ListConfig<InventoryItem> = {
  searchFields: (i) => [i.sku, i.name, i.category, i.supplierName, i.warehouseLocation],
  filters: {
    category: (i, v) => i.category === v,
    health: (i, v) => i.health === v,
  },
};
const supplierList: ListConfig<Supplier> = {
  searchFields: (s) => [s.name, s.contactName, s.email, s.phone],
  filters: { status: (s, v) => s.status === v },
};
const purchaseOrderList: ListConfig<PurchaseOrder> = {
  searchFields: (p) => [p.number, p.supplierName, p.raisedByName],
  filters: { status: (p, v) => p.status === v },
};
const invoiceList: ListConfig<Invoice> = {
  searchFields: (i) => [i.number, i.customerName],
  filters: { status: (i, v) => i.status === v },
};
const paymentList: ListConfig<(typeof db.payments)[number]> = {
  searchFields: (p) => [p.invoiceNumber, p.method],
  filters: { method: (p, v) => p.method === v },
};

// --- Mutation handlers -------------------------------------------------------

function approveWorkflow(execId: string): WorkflowExecution {
  const wf = db.workflows.find((w) => w.id === execId);
  if (!wf) throw new ApiError(404, `Workflow ${execId} not found`);
  const step = wf.steps.find((s) => s.status === "waiting_approval");
  if (step) {
    step.status = "succeeded";
    step.finishedAt = new Date().toISOString();
    step.durationMs = 4200;
    step.output = { approved: true };
    step.updatedAt = new Date().toISOString();
  }
  // Advance: mark remaining pending steps as succeeded to complete the run.
  for (const s of wf.steps) {
    if (s.status === "pending") {
      s.status = "succeeded";
      s.startedAt = new Date().toISOString();
      s.finishedAt = new Date().toISOString();
      s.durationMs = 3000;
      s.output = { ok: true };
      s.updatedAt = new Date().toISOString();
    }
  }
  const succeeded = wf.steps.filter((s) => s.status === "succeeded").length;
  wf.progressPct = Math.round((succeeded / wf.steps.length) * 100);
  wf.status = wf.steps.every((s) => s.status === "succeeded" || s.status === "skipped") ? "completed" : "running";
  wf.currentStepKey = wf.steps.find((s) => s.status !== "succeeded" && s.status !== "skipped")?.key;
  wf.finishedAt = wf.status === "completed" ? new Date().toISOString() : undefined;
  wf.updatedAt = new Date().toISOString();

  // Remove derived approval entry.
  db.approvals = db.approvals.filter((a) => a.executionId !== execId);
  return wf;
}

function retryWorkflow(execId: string): WorkflowExecution {
  const wf = db.workflows.find((w) => w.id === execId);
  if (!wf) throw new ApiError(404, `Workflow ${execId} not found`);
  const step = wf.steps.find((s) => s.status === "failed");
  if (step) {
    step.status = "running";
    step.error = undefined;
    step.startedAt = new Date().toISOString();
    step.finishedAt = undefined;
    step.durationMs = undefined;
    step.retryCount += 1;
    step.updatedAt = new Date().toISOString();
    wf.currentStepKey = step.key;
  }
  wf.status = "running";
  wf.updatedAt = new Date().toISOString();
  // Clear matching retry-queue entry.
  db.retryQueue = db.retryQueue.filter((r) => r.workflowTitle !== wf.title);
  return wf;
}

function setPurchaseOrderStatus(poId: string, status: PurchaseOrder["status"], approve: boolean): PurchaseOrder {
  const po = db.purchaseOrders.find((p) => p.id === poId);
  if (!po) throw new ApiError(404, `Purchase order ${poId} not found`);
  po.status = status;
  if (approve) po.approverName = "Rohan Kapoor";
  po.updatedAt = new Date().toISOString();
  return po;
}

function markNotificationRead(notifId: string): AppNotification {
  const n = db.notifications.find((x) => x.id === notifId);
  if (!n) throw new ApiError(404, `Notification ${notifId} not found`);
  n.read = true;
  n.updatedAt = new Date().toISOString();
  return n;
}

function markAllNotificationsRead(): { updated: number } {
  let updated = 0;
  for (const n of db.notifications) {
    if (!n.read) {
      n.read = true;
      n.updatedAt = new Date().toISOString();
      updated++;
    }
  }
  return { updated };
}

function toggleAgent(key: string, body: unknown): Agent {
  const agent = db.agents.find((a) => a.key === key);
  if (!agent) throw new ApiError(404, `Agent ${key} not found`);
  const requested =
    body && typeof body === "object" && "autonomous" in body
      ? Boolean((body as { autonomous: unknown }).autonomous)
      : !agent.autonomous;
  agent.autonomous = requested;
  agent.updatedAt = new Date().toISOString();
  return agent;
}

// --- Router ------------------------------------------------------------------

function route(path: string, opts: Opts): unknown {
  const method = (opts.method ?? "GET").toUpperCase();
  const params = opts.params ?? {};

  // Normalize: strip query/trailing slash (apiFetch passes path only, but be safe).
  const clean = path.split("?")[0] ?? path;

  // --- Mutations (POST) ---
  if (method === "POST") {
    let m: RegExpMatchArray | null;
    if ((m = clean.match(/^\/workflows\/([^/]+)\/approve$/))) return approveWorkflow(m[1] as string);
    if ((m = clean.match(/^\/workflows\/([^/]+)\/retry$/))) return retryWorkflow(m[1] as string);
    if ((m = clean.match(/^\/purchase-orders\/([^/]+)\/approve$/)))
      return setPurchaseOrderStatus(m[1] as string, "approved", true);
    if ((m = clean.match(/^\/purchase-orders\/([^/]+)\/reject$/)))
      return setPurchaseOrderStatus(m[1] as string, "cancelled", false);
    if (clean === "/notifications/read-all") return markAllNotificationsRead();
    if ((m = clean.match(/^\/notifications\/([^/]+)\/read$/))) return markNotificationRead(m[1] as string);
    if ((m = clean.match(/^\/agents\/([^/]+)\/toggle$/))) return toggleAgent(m[1] as string, opts.body);
    throw new ApiError(404, `No mock route for POST ${clean}`);
  }

  // --- Detail / nested GET (check before generic lists) ---
  let m: RegExpMatchArray | null;
  if ((m = clean.match(/^\/customers\/([^/]+)\/vehicles$/))) {
    const cid = m[1] as string;
    if (!db.customers.some((c) => c.id === cid)) throw new ApiError(404, `Customer ${cid} not found`);
    return db.vehicles.filter((v) => v.ownerId === cid);
  }
  if ((m = clean.match(/^\/customers\/([^/]+)$/))) {
    const found = db.customers.find((c) => c.id === m![1]);
    if (!found) throw new ApiError(404, `Customer ${m[1]} not found`);
    return found;
  }
  if ((m = clean.match(/^\/vehicles\/([^/]+)\/telematics$/))) {
    const vid = m[1] as string;
    if (!db.vehicles.some((v) => v.id === vid)) throw new ApiError(404, `Vehicle ${vid} not found`);
    return db.telematics
      .filter((t) => t.vehicleId === vid)
      .sort((a, b) => +new Date(b.recordedAt) - +new Date(a.recordedAt));
  }
  if ((m = clean.match(/^\/vehicles\/([^/]+)\/predictions$/))) {
    const vid = m[1] as string;
    if (!db.vehicles.some((v) => v.id === vid)) throw new ApiError(404, `Vehicle ${vid} not found`);
    return db.predictions.filter((p) => p.vehicleId === vid);
  }
  if ((m = clean.match(/^\/vehicles\/([^/]+)$/))) {
    const found = db.vehicles.find((v) => v.id === m![1]);
    if (!found) throw new ApiError(404, `Vehicle ${m[1]} not found`);
    return found;
  }

  // --- List endpoints (paginated) ---
  switch (clean) {
    case "/customers":
      return paginate(db.customers, params, customerList);
    case "/vehicles":
      return paginate(db.vehicles, params, vehicleList);
    case "/appointments":
      return paginate(db.appointments, params, appointmentList);
    case "/work-orders":
      return paginate(db.workOrders, params, workOrderList);
    case "/inventory":
      return paginate(db.inventory, params, inventoryList);
    case "/suppliers":
      return paginate(db.suppliers, params, supplierList);
    case "/purchase-orders":
      return paginate(db.purchaseOrders, params, purchaseOrderList);
    case "/invoices":
      return paginate(db.invoices, params, invoiceList);
    case "/payments":
      return paginate(db.payments, params, paymentList);

    // --- Plain arrays ---
    case "/bays":
      return db.bays;
    case "/technicians":
      return db.technicians;
    case "/agents":
      return db.agents;
    case "/agents/decisions":
      return db.decisions;
    case "/agents/actions":
      return db.actions;
    case "/workflows":
      return db.workflows;
    case "/approvals":
      return db.approvals;
    case "/retry-queue":
      return db.retryQueue;
    case "/activity":
      return db.activity;
    case "/notifications":
      return db.notifications;

    // --- Aggregation objects ---
    case "/dashboard":
      return dashboard();
    case "/analytics":
      return analytics();
    case "/finance/summary":
      return financeSummary();
    case "/inventory/summary":
      return inventorySummary();

    default:
      throw new ApiError(404, `No mock route for ${method} ${clean}`);
  }
}

/** Public mock API entrypoint used by apiFetch when USE_MOCK is on. */
export async function mockApi(path: string, opts: Opts = {}): Promise<unknown> {
  await delay(200);
  return route(path, opts);
}

// --- Auth mocks --------------------------------------------------------------

export function mockLogin(): TokenEnvelope {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    token_type: "bearer",
  };
}

export function mockMe(): AuthUser {
  return {
    id: "user_owner",
    email: "owner@apexmotors.in",
    fullName: "Rohan Kapoor",
    roles: ["owner"],
    dealershipId: db.dealershipId,
  };
}
