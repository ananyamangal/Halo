import type {
  ActivityEvent,
  Agent,
  AgentAction,
  AgentDecision,
  Appointment,
  ApprovalRequest,
  Customer,
  InventoryItem,
  Invoice,
  Money,
  Payment,
  PredictedMaintenance,
  PurchaseOrder,
  PurchaseOrderItem,
  RetryQueueItem,
  ServiceBay,
  Supplier,
  Technician,
  TelematicsEvent,
  TrendPoint,
  Vehicle,
  WorkflowExecution,
  WorkflowStep,
  WorkOrder,
  WorkOrderLine,
} from "@halo/types";
import type { AppNotification } from "@/lib/api/types";

/**
 * Deterministic, in-memory, MUTABLE mock dataset for the Halo dealership app.
 *
 * A seeded RNG (mulberry32) makes the *content* stable across reloads, while
 * timestamps are generated relative to the real `Date.now()` so the UI looks
 * live. The dataset is read purely client-side (via React Query), so there is
 * no SSR/hydration concern — we intentionally do not freeze a BASE_DATE.
 *
 * Every shape here mirrors `@halo/types` and `@/lib/api/types` exactly.
 */

// --- Seeded RNG --------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0x4841_4c4f); // "HALO"

function rnd(): number {
  return rand();
}
function int(min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  // arr is always non-empty at call sites; assert for noUncheckedIndexedAccess.
  return arr[int(0, arr.length - 1)] as T;
}
function chance(p: number): boolean {
  return rnd() < p;
}
function round(n: number, dp = 0): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// --- Time helpers ------------------------------------------------------------

const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function iso(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString();
}
function daysAgo(d: number): string {
  return iso(-d * DAY);
}
function daysFromNow(d: number): string {
  return iso(d * DAY);
}
function hoursAgo(h: number): string {
  return iso(-h * HOUR);
}
function minutesFromNow(m: number): string {
  return iso(m * MIN);
}

// --- Money helper ------------------------------------------------------------

function inr(rupees: number): Money {
  return { amountMinor: Math.round(rupees * 100), currency: "INR" };
}

// --- ID helper ---------------------------------------------------------------

function id(prefix: string, n: number): string {
  return `${prefix}_${String(n).padStart(4, "0")}`;
}

// --- Seed vocab (realistic Indian dealership) --------------------------------

const FIRST_NAMES = [
  "Rohan", "Priya", "Arjun", "Sneha", "Vikram", "Anjali", "Rahul", "Kavya",
  "Aditya", "Meera", "Karan", "Divya", "Sanjay", "Pooja", "Nikhil", "Isha",
  "Aarav", "Riya", "Manish", "Neha", "Suresh", "Anita", "Deepak", "Sunita",
  "Vivek", "Tara", "Rajesh", "Lakshmi", "Amit", "Shreya", "Gaurav", "Nisha",
  "Harsh", "Ananya", "Varun", "Ritika", "Yash", "Pallavi", "Tarun", "Megha",
] as const;

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Gupta", "Singh",
  "Kapoor", "Mehta", "Joshi", "Rao", "Desai", "Kulkarni", "Chopra", "Bose",
] as const;

const CITIES = [
  "Mumbai", "Pune", "Bengaluru", "Delhi", "Hyderabad", "Chennai", "Ahmedabad",
  "Kolkata", "Jaipur", "Surat",
] as const;

const LOYALTY_TIERS = ["bronze", "silver", "gold", "platinum"] as const;

const VEHICLE_MODELS: ReadonlyArray<{ make: string; model: string; variant: string }> = [
  { make: "Maruti Suzuki", model: "Swift", variant: "ZXi" },
  { make: "Maruti Suzuki", model: "Baleno", variant: "Alpha" },
  { make: "Hyundai", model: "Creta", variant: "SX(O)" },
  { make: "Hyundai", model: "i20", variant: "Asta" },
  { make: "Tata", model: "Nexon", variant: "XZ+" },
  { make: "Tata", model: "Harrier", variant: "XZA+" },
  { make: "Mahindra", model: "XUV700", variant: "AX7" },
  { make: "Mahindra", model: "Thar", variant: "LX" },
  { make: "Toyota", model: "Innova Crysta", variant: "ZX" },
  { make: "Toyota", model: "Fortuner", variant: "Legender" },
  { make: "Kia", model: "Seltos", variant: "GTX+" },
  { make: "Honda", model: "City", variant: "VX" },
];

const COLORS = ["Pearl White", "Midnight Black", "Silky Silver", "Fiery Red", "Ocean Blue", "Graphite Grey"] as const;

const SERVICE_TYPES = [
  "Periodic Service", "Brake Service", "Engine Diagnostics", "AC Service",
  "Tyre Replacement", "Battery Check", "Wheel Alignment", "Accident Repair",
] as const;

const PART_CATEGORIES = ["Brakes", "Engine", "Filters", "Electrical", "Suspension", "Lubricants", "Tyres", "Body"] as const;

const PART_NAMES: Record<string, readonly string[]> = {
  Brakes: ["Brake Pad Set", "Brake Disc", "Brake Fluid DOT4", "Brake Caliper"],
  Engine: ["Spark Plug", "Timing Belt", "Engine Mount", "Piston Ring Set"],
  Filters: ["Air Filter", "Oil Filter", "Cabin Filter", "Fuel Filter"],
  Electrical: ["Battery 12V", "Alternator", "Starter Motor", "Headlight Assembly"],
  Suspension: ["Shock Absorber", "Coil Spring", "Control Arm", "Stabilizer Link"],
  Lubricants: ["Engine Oil 5W30", "Gear Oil", "Coolant", "Power Steering Fluid"],
  Tyres: ["Tyre 195/55 R16", "Tyre 215/60 R17", "Tube", "Valve Stem"],
  Body: ["Front Bumper", "Wing Mirror", "Door Handle", "Windshield"],
};

const TECH_SPECIALTIES = [
  "Engine Specialist", "Brake & Suspension", "Electrical Systems",
  "Diagnostics Expert", "Body & Paint", "AC & Cooling", "Transmission", "General Service",
] as const;

const SUPPLIER_NAMES = [
  "Bharat Auto Parts", "Spark Components Pvt Ltd", "Reliable Spares Co",
  "Precision Motors Supply", "Apex Lubricants", "TyreMart Distributors",
  "ElectroAuto Systems", "Genuine Parts India", "Velocity Spares", "Metro Auto Trade",
] as const;

const ABC_CLASSES = ["A", "B", "C"] as const;

// --- Builders ----------------------------------------------------------------

const DEALERSHIP_ID = "dealer_0001";

function makeName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

// Customers
function buildCustomers(count: number): Customer[] {
  const list: Customer[] = [];
  for (let i = 0; i < count; i++) {
    const name = makeName();
    const tier = pick(LOYALTY_TIERS);
    const lifetime = int(15_000, 850_000);
    const created = -int(60, 1400) * DAY;
    list.push({
      id: id("cust", i + 1),
      createdAt: iso(created),
      updatedAt: iso(-int(0, 30) * DAY),
      name,
      email: chance(0.85) ? `${name.toLowerCase().replace(/\s+/g, ".")}@gmail.com` : undefined,
      phone: `+91 ${int(70, 99)}${int(10000000, 99999999)}`,
      whatsappOptIn: chance(0.8),
      whatsappReachable: chance(0.7),
      city: pick(CITIES),
      loyaltyTier: tier,
      loyaltyPoints: int(0, 12000),
      lifetimeValue: inr(lifetime),
      vehicleCount: 0, // set after vehicles
      lastVisitAt: chance(0.9) ? daysAgo(int(1, 180)) : undefined,
      satisfactionScore: int(58, 99),
    });
  }
  return list;
}

// Vehicles + telematics + predictions
function buildVehicles(customers: Customer[]): {
  vehicles: Vehicle[];
  telematics: TelematicsEvent[];
  predictions: PredictedMaintenance[];
} {
  const vehicles: Vehicle[] = [];
  const telematics: TelematicsEvent[] = [];
  const predictions: PredictedMaintenance[] = [];
  let vIdx = 0;
  let teIdx = 0;

  for (const cust of customers) {
    const n = chance(0.5) ? 2 : 1;
    let owned = 0;
    for (let k = 0; k < n && vehicles.length < 60; k++) {
      vIdx++;
      owned++;
      const m = pick(VEHICLE_MODELS);
      const year = int(2015, 2024);
      const health = int(45, 99);
      const mileage = int(8_000, 165_000);
      const vid = id("veh", vIdx);
      vehicles.push({
        id: vid,
        createdAt: daysAgo(int(30, 1200)),
        updatedAt: daysAgo(int(0, 20)),
        vin: `MA${int(1, 9)}${pick(["TA", "HY", "MS", "KI", "TO"])}${int(100000, 999999)}${int(10, 99)}`,
        chassisNumber: `CHS${int(1000000, 9999999)}`,
        registration: `${pick(["MH", "KA", "DL", "TN", "TS", "GJ", "WB", "RJ"])}${int(10, 49)} ${pick(["AB", "CD", "XY", "PQ", "Z"])} ${int(1000, 9999)}`,
        make: m.make,
        model: m.model,
        variant: m.variant,
        year,
        color: pick(COLORS),
        ownerId: cust.id,
        ownerName: cust.name,
        mileageKm: mileage,
        warrantyValidUntil: chance(0.5) ? daysFromNow(int(30, 720)) : undefined,
        healthScore: health,
        nextServiceDueKm: mileage + int(500, 5000),
      });

      // Telematics events (2-5 per vehicle)
      const teCount = int(2, 5);
      for (let t = 0; t < teCount; t++) {
        teIdx++;
        const type = pick([
          "brake_wear", "battery", "tyre_pressure", "engine", "dtc_code", "mileage",
        ] as const);
        const sev = pick(["info", "warning", "critical"] as const);
        telematics.push({
          id: id("tel", teIdx),
          createdAt: hoursAgo(int(1, 240)),
          updatedAt: hoursAgo(int(0, 12)),
          vehicleId: vid,
          type,
          label:
            type === "brake_wear" ? "Front brake pad wear"
            : type === "battery" ? "Battery health"
            : type === "tyre_pressure" ? "Front-left tyre pressure"
            : type === "engine" ? "Engine temperature"
            : type === "dtc_code" ? "DTC P0301 detected"
            : "Odometer reading",
          value:
            type === "tyre_pressure" ? round(28 + rnd() * 8, 1)
            : type === "mileage" ? mileage
            : type === "dtc_code" ? 301
            : int(15, 95),
          unit:
            type === "tyre_pressure" ? "psi"
            : type === "mileage" ? "km"
            : type === "dtc_code" ? "code"
            : "%",
          severity: sev,
          recordedAt: hoursAgo(int(1, 240)),
        });
      }

      // Predicted maintenance (0-2 per vehicle)
      if (chance(0.6)) {
        const predCount = int(1, 2);
        const comps = ["Brake Pads", "Battery", "Engine Oil", "Air Filter", "Clutch", "Tyres"];
        for (let p = 0; p < predCount; p++) {
          predictions.push({
            vehicleId: vid,
            component: comps[int(0, comps.length - 1)] as string,
            remainingPct: int(5, 60),
            predictedDueDate: daysFromNow(int(5, 120)),
            estimatedCost: inr(int(1500, 35000)),
            confidence: round(0.6 + rnd() * 0.39, 2),
          });
        }
      }
    }
    cust.vehicleCount = owned;
  }
  return { vehicles, telematics, predictions };
}

// Technicians
function buildTechnicians(count: number): Technician[] {
  const list: Technician[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id: id("tech", i + 1),
      createdAt: daysAgo(int(100, 1500)),
      updatedAt: daysAgo(int(0, 5)),
      name: makeName(),
      specialty: TECH_SPECIALTIES[i % TECH_SPECIALTIES.length] as string,
      utilizationPct: int(45, 98),
      jobsCompletedToday: int(0, 9),
      rating: round(3.5 + rnd() * 1.5, 1),
      available: chance(0.4),
    });
  }
  return list;
}

// Service bays
function buildBays(count: number, technicians: Technician[], vehicles: Vehicle[]): ServiceBay[] {
  const list: ServiceBay[] = [];
  const jobStatuses = ["in_progress", "quality_check", "awaiting_parts", "ready"] as const;
  for (let i = 0; i < count; i++) {
    const occupied = i < count - 2 ? chance(0.85) : chance(0.2);
    const maintenance = !occupied && chance(0.25);
    if (occupied) {
      const tech = technicians[int(0, technicians.length - 1)] as Technician;
      const veh = vehicles[int(0, vehicles.length - 1)] as Vehicle;
      list.push({
        id: id("bay", i + 1),
        createdAt: daysAgo(800),
        updatedAt: hoursAgo(int(0, 3)),
        name: `Bay ${i + 1}`,
        status: "occupied",
        technicianId: tech.id,
        technicianName: tech.name,
        vehicleId: veh.id,
        vehicleLabel: `${veh.make} ${veh.model} · ${veh.registration}`,
        workOrderId: id("wo", int(1, 24)),
        jobStatus: pick(jobStatuses),
        progressPct: int(10, 95),
        etaMinutes: int(15, 180),
        partsReady: chance(0.6),
      });
    } else {
      list.push({
        id: id("bay", i + 1),
        createdAt: daysAgo(800),
        updatedAt: hoursAgo(int(0, 6)),
        name: `Bay ${i + 1}`,
        status: maintenance ? "maintenance" : "idle",
      });
    }
  }
  return list;
}

// Appointments
function buildAppointments(count: number, customers: Customer[], vehicles: Vehicle[]): Appointment[] {
  const list: Appointment[] = [];
  const statuses = ["scheduled", "confirmed", "in_progress", "completed", "no_show", "cancelled"] as const;
  for (let i = 0; i < count; i++) {
    const veh = vehicles[int(0, vehicles.length - 1)] as Vehicle;
    const cust = customers.find((c) => c.id === veh.ownerId) ?? (customers[0] as Customer);
    const future = chance(0.5);
    list.push({
      id: id("appt", i + 1),
      createdAt: daysAgo(int(1, 30)),
      updatedAt: daysAgo(int(0, 5)),
      customerId: cust.id,
      customerName: cust.name,
      vehicleId: veh.id,
      vehicleLabel: `${veh.make} ${veh.model} · ${veh.registration}`,
      serviceType: pick(SERVICE_TYPES),
      status: future ? pick(["scheduled", "confirmed"] as const) : pick(statuses),
      scheduledFor: future ? daysFromNow(int(0, 14)) : daysAgo(int(0, 20)),
      advisorName: makeName(),
    });
  }
  return list;
}

// Work orders
function buildWorkOrders(count: number, customers: Customer[], vehicles: Vehicle[], technicians: Technician[]): WorkOrder[] {
  const list: WorkOrder[] = [];
  const statuses = ["open", "awaiting_parts", "in_progress", "quality_check", "ready", "delivered", "on_hold"] as const;
  for (let i = 0; i < count; i++) {
    const veh = vehicles[int(0, vehicles.length - 1)] as Vehicle;
    const cust = customers.find((c) => c.id === veh.ownerId) ?? (customers[0] as Customer);
    const tech = chance(0.85) ? (technicians[int(0, technicians.length - 1)] as Technician) : undefined;
    const status = pick(statuses);
    const lineCount = int(1, 4);
    const lines: WorkOrderLine[] = [];
    let totalRupees = 0;
    for (let l = 0; l < lineCount; l++) {
      const isLabour = chance(0.4);
      const qty = isLabour ? int(1, 4) : int(1, 6);
      const unit = isLabour ? int(400, 1500) : int(250, 12000);
      totalRupees += qty * unit;
      lines.push({
        id: id("wol", i * 10 + l + 1),
        description: isLabour ? `${pick(SERVICE_TYPES)} labour` : (PART_NAMES[pick(PART_CATEGORIES)]?.[0] ?? "Part"),
        type: isLabour ? "labour" : "part",
        quantity: qty,
        unitPrice: inr(unit),
      });
    }
    const progress =
      status === "delivered" || status === "ready" ? 100
      : status === "open" ? int(0, 15)
      : int(20, 90);
    list.push({
      id: id("wo", i + 1),
      createdAt: daysAgo(int(0, 25)),
      updatedAt: hoursAgo(int(0, 48)),
      number: `WO-${2026}-${String(1000 + i).padStart(4, "0")}`,
      customerId: cust.id,
      customerName: cust.name,
      vehicleId: veh.id,
      vehicleLabel: `${veh.make} ${veh.model} · ${veh.registration}`,
      status,
      bayId: chance(0.6) ? id("bay", int(1, 8)) : undefined,
      technicianId: tech?.id,
      technicianName: tech?.name,
      openedAt: daysAgo(int(0, 20)),
      promisedAt: chance(0.8) ? daysFromNow(int(0, 7)) : undefined,
      lines,
      total: inr(totalRupees),
      progressPct: progress,
    });
  }
  return list;
}

// Suppliers
function buildSuppliers(count: number): Supplier[] {
  const list: Supplier[] = [];
  for (let i = 0; i < count; i++) {
    const name = SUPPLIER_NAMES[i % SUPPLIER_NAMES.length] as string;
    list.push({
      id: id("sup", i + 1),
      createdAt: daysAgo(int(200, 1500)),
      updatedAt: daysAgo(int(0, 30)),
      name,
      contactName: makeName(),
      email: `sales@${name.toLowerCase().replace(/[^a-z]+/g, "")}.in`,
      phone: `+91 ${int(70, 99)}${int(10000000, 99999999)}`,
      rating: round(3 + rnd() * 2, 1),
      onTimeDeliveryPct: int(72, 99),
      avgLeadTimeDays: int(2, 14),
      activeOrders: 0, // set after POs
      status: chance(0.85) ? "active" : pick(["on_hold", "inactive"] as const),
    });
  }
  return list;
}

// Inventory
function buildInventory(count: number, suppliers: Supplier[]): InventoryItem[] {
  const list: InventoryItem[] = [];
  for (let i = 0; i < count; i++) {
    const category = pick(PART_CATEGORIES);
    const name = pick(PART_NAMES[category] ?? ["Part"]);
    const safety = int(5, 40);
    const reorder = safety + int(5, 30);
    const demand = int(2, 120);
    const sup = suppliers[int(0, suppliers.length - 1)] as Supplier;

    // Vary stock so health buckets are populated.
    const roll = rnd();
    let stock: number;
    if (roll < 0.15) stock = int(0, safety - 1 < 0 ? 0 : safety - 1); // critical
    else if (roll < 0.35) stock = int(safety, reorder - 1); // low
    else if (roll < 0.8) stock = int(reorder, reorder + 60); // healthy
    else if (roll < 0.92) stock = reorder + int(120, 400); // overstock
    else stock = reorder + int(200, 600); // dead candidate

    const lowDemand = demand < 8;
    let health: InventoryItem["health"];
    if (stock <= 0 || stock < safety) health = "critical";
    else if (stock < reorder) health = "low";
    else if (stock > reorder + 150 && lowDemand) health = "dead";
    else if (stock > reorder + 100) health = "overstock";
    else health = "healthy";

    const trend: TrendPoint[] = [];
    for (let w = 0; w < 6; w++) {
      trend.push({ label: `W${w + 1}`, value: int(0, Math.max(2, Math.round(demand / 4))) });
    }

    list.push({
      id: id("inv", i + 1),
      createdAt: daysAgo(int(60, 900)),
      updatedAt: daysAgo(int(0, 14)),
      sku: `${category.slice(0, 3).toUpperCase()}-${int(1000, 9999)}`,
      name,
      category,
      warehouseLocation: `${pick(["A", "B", "C", "D"])}-${int(1, 12)}-${int(1, 8)}`,
      currentStock: stock,
      safetyStock: safety,
      reorderPoint: reorder,
      predictedDemand30d: demand,
      leadTimeDays: int(2, 21),
      unitCost: inr(int(150, 18000)),
      abcClass: pick(ABC_CLASSES),
      health,
      supplierId: sup.id,
      supplierName: sup.name,
      consumptionTrend: trend,
    });
  }
  return list;
}

// Purchase orders
function buildPurchaseOrders(count: number, suppliers: Supplier[], inventory: InventoryItem[]): PurchaseOrder[] {
  const list: PurchaseOrder[] = [];
  const statuses = [
    "draft", "pending_approval", "approved", "ordered", "partially_received", "received", "cancelled",
  ] as const;
  for (let i = 0; i < count; i++) {
    const sup = suppliers[int(0, suppliers.length - 1)] as Supplier;
    // Ensure several pending_approval.
    const status = i < 5 ? "pending_approval" : pick(statuses);
    const itemCount = int(1, 4);
    const items: PurchaseOrderItem[] = [];
    let totalRupees = 0;
    for (let k = 0; k < itemCount; k++) {
      const inv = inventory[int(0, inventory.length - 1)] as InventoryItem;
      const qty = int(5, 80);
      totalRupees += qty * (inv.unitCost.amountMinor / 100);
      items.push({
        id: id("poi", i * 10 + k + 1),
        itemId: inv.id,
        sku: inv.sku,
        name: inv.name,
        quantity: qty,
        unitCost: inv.unitCost,
      });
    }
    list.push({
      id: id("po", i + 1),
      createdAt: daysAgo(int(0, 40)),
      updatedAt: daysAgo(int(0, 10)),
      number: `PO-${2026}-${String(500 + i).padStart(4, "0")}`,
      supplierId: sup.id,
      supplierName: sup.name,
      status,
      items,
      total: inr(Math.round(totalRupees)),
      expectedDelivery: chance(0.8) ? daysFromNow(int(1, 21)) : undefined,
      approverName: status === "draft" || status === "pending_approval" ? undefined : makeName(),
      raisedByName: makeName(),
    });
  }
  return list;
}

// Invoices + payments
function buildInvoices(count: number, customers: Customer[], workOrders: WorkOrder[]): {
  invoices: Invoice[];
  payments: Payment[];
} {
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  let payIdx = 0;
  const methods = ["cash", "card", "upi", "bank_transfer", "cheque", "credit"] as const;

  for (let i = 0; i < count; i++) {
    const cust = customers[int(0, customers.length - 1)] as Customer;
    const wo = chance(0.7) ? (workOrders[int(0, workOrders.length - 1)] as WorkOrder) : undefined;
    const subtotal = int(2000, 90000);
    const gst = Math.round(subtotal * 0.18);
    const total = subtotal + gst;
    const issued = daysAgo(int(0, 90));
    const due = daysFromNow(int(-30, 30));
    const overdue = new Date(due).getTime() < NOW;

    const roll = rnd();
    let status: Invoice["status"];
    let paid: number;
    if (roll < 0.1) {
      status = "draft";
      paid = 0;
    } else if (roll < 0.2) {
      status = "issued";
      paid = 0;
    } else if (roll < 0.4) {
      status = "partially_paid";
      paid = Math.round(total * (0.2 + rnd() * 0.5));
    } else if (roll < 0.75) {
      status = "paid";
      paid = total;
    } else if (roll < 0.95) {
      status = overdue ? "overdue" : "issued";
      paid = 0;
    } else {
      status = "void";
      paid = 0;
    }

    const invId = id("inv-doc", i + 1);
    const number = `INV-${2026}-${String(3000 + i).padStart(4, "0")}`;
    invoices.push({
      id: invId,
      createdAt: issued,
      updatedAt: daysAgo(int(0, 10)),
      number,
      customerId: cust.id,
      customerName: cust.name,
      workOrderId: wo?.id,
      status,
      issuedAt: issued,
      dueAt: due,
      subtotal: inr(subtotal),
      gstAmount: inr(gst),
      total: inr(total),
      amountPaid: inr(paid),
      erpSynced: status === "paid" ? chance(0.7) : chance(0.2),
    });

    // Derived payments for paid / partially_paid invoices.
    if (paid > 0) {
      const installments = status === "partially_paid" ? int(1, 2) : int(1, 2);
      let remaining = paid;
      for (let p = 0; p < installments; p++) {
        payIdx++;
        const amt = p === installments - 1 ? remaining : Math.round(remaining / 2);
        remaining -= amt;
        if (amt <= 0) continue;
        payments.push({
          id: id("pay", payIdx),
          createdAt: daysAgo(int(0, 60)),
          updatedAt: daysAgo(int(0, 10)),
          invoiceId: invId,
          invoiceNumber: number,
          method: pick(methods),
          amount: inr(amt),
          receivedAt: daysAgo(int(0, 60)),
          reconciled: chance(0.7),
        });
      }
    }
  }
  return { invoices, payments };
}

// Activity events
function buildActivity(count: number): ActivityEvent[] {
  const list: ActivityEvent[] = [];
  const modules = ["service", "inventory", "finance", "procurement", "ai"];
  const templates: Array<{ action: string; target: string; module: string; icon: string }> = [
    { action: "approved purchase order", target: "PO-2026-0503", module: "procurement", icon: "check" },
    { action: "completed work order", target: "WO-2026-1004", module: "service", icon: "wrench" },
    { action: "raised invoice", target: "INV-2026-3012", module: "finance", icon: "file" },
    { action: "reserved parts for", target: "WO-2026-1007", module: "inventory", icon: "package" },
    { action: "flagged low stock on", target: "Brake Pad Set", module: "inventory", icon: "alert" },
    { action: "booked appointment for", target: "Hyundai Creta", module: "service", icon: "calendar" },
    { action: "reconciled payment for", target: "INV-2026-3004", module: "finance", icon: "rupee" },
    { action: "triggered workflow on", target: "Proactive Service", module: "ai", icon: "bot" },
  ];
  for (let i = 0; i < count; i++) {
    const t = templates[int(0, templates.length - 1)] as (typeof templates)[number];
    const actor = chance(0.4) ? pick(["Aria", "Vault", "Cipher"] as const) : makeName();
    list.push({
      id: id("act", i + 1),
      createdAt: hoursAgo(i * 2 + int(0, 2)),
      updatedAt: hoursAgo(i * 2),
      actor,
      action: t.action,
      target: t.target,
      module: t.module ?? modules[int(0, modules.length - 1)],
      icon: t.icon,
    });
  }
  // Newest first.
  return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

// Notifications
function buildNotifications(): AppNotification[] {
  const defs: Array<Omit<AppNotification, "id" | "createdAt" | "updatedAt">> = [
    { title: "Critical stock alert", body: "Brake Pad Set is below safety stock at 2 units.", severity: "critical", module: "inventory", read: false },
    { title: "PO awaiting approval", body: "PO-2026-0501 for Bharat Auto Parts needs your approval.", severity: "warning", module: "procurement", read: false },
    { title: "Invoice overdue", body: "INV-2026-3007 is 6 days overdue (₹42,300).", severity: "warning", module: "finance", read: false },
    { title: "Workflow needs approval", body: "Cipher paused 'Proactive Service' pending customer approval.", severity: "info", module: "ai", read: false },
    { title: "Service completed", body: "WO-2026-1004 (Tata Nexon) is ready for delivery.", severity: "success", module: "service", read: true },
    { title: "ERP sync succeeded", body: "12 invoices synced to Tally ERP overnight.", severity: "success", module: "finance", read: true },
    { title: "New appointment", body: "Priya Sharma booked a Periodic Service for tomorrow.", severity: "info", module: "service", read: true },
  ];
  return defs.map((d, i) => ({
    ...d,
    id: id("notif", i + 1),
    createdAt: hoursAgo(i * 3 + 1),
    updatedAt: hoursAgo(i * 3),
  })).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

// Agents
function buildAgents(): Agent[] {
  return [
    {
      id: "agent_aria",
      createdAt: daysAgo(400),
      updatedAt: minutesFromNow(-int(1, 30)),
      key: "aria",
      name: "Aria",
      domain: "Service & Customer Lifecycle",
      description: "Monitors telematics, predicts service needs, and orchestrates the customer journey from outreach to delivery.",
      status: "active",
      autonomous: true,
      confidence: 0.92,
      healthPct: 97,
      runningTasks: 3,
      queuedDecisions: 5,
      currentWorkflow: "Proactive Service",
      lastDecision: "Booked appointment for Hyundai Creta brake service",
      lastActionAt: minutesFromNow(-7),
      cpuPct: 34,
      memoryPct: 41,
      actionsToday: 48,
      successRatePct: 96,
    },
    {
      id: "agent_vault",
      createdAt: daysAgo(400),
      updatedAt: minutesFromNow(-int(1, 30)),
      key: "vault",
      name: "Vault",
      domain: "Inventory & Procurement",
      description: "Forecasts demand, prevents stockouts, and auto-raises purchase orders within approved thresholds.",
      status: "active",
      autonomous: true,
      confidence: 0.88,
      healthPct: 94,
      runningTasks: 2,
      queuedDecisions: 3,
      currentWorkflow: "Auto Replenishment",
      lastDecision: "Raised PO-2026-0501 for brake pads (predicted stockout in 4 days)",
      lastActionAt: minutesFromNow(-22),
      cpuPct: 28,
      memoryPct: 37,
      actionsToday: 31,
      successRatePct: 93,
    },
    {
      id: "agent_cipher",
      createdAt: daysAgo(400),
      updatedAt: minutesFromNow(-int(1, 30)),
      key: "cipher",
      name: "Cipher",
      domain: "Finance & Reconciliation",
      description: "Reconciles payments, syncs invoices to ERP, and flags overdue or anomalous transactions.",
      status: "degraded",
      autonomous: false,
      confidence: 0.81,
      healthPct: 78,
      runningTasks: 1,
      queuedDecisions: 7,
      currentWorkflow: "ERP Reconciliation",
      lastDecision: "Flagged INV-2026-3007 as overdue and notified owner",
      lastActionAt: minutesFromNow(-3),
      cpuPct: 52,
      memoryPct: 63,
      actionsToday: 19,
      successRatePct: 88,
    },
  ];
}

// Agent decisions
function buildDecisions(count: number): AgentDecision[] {
  const list: AgentDecision[] = [];
  const agents = [
    { key: "aria", name: "Aria" },
    { key: "vault", name: "Vault" },
    { key: "cipher", name: "Cipher" },
  ] as const;
  const outcomes = ["executed", "suggested", "rejected", "awaiting_approval"] as const;
  const templates = [
    { summary: "Predicted brake wear on Hyundai Creta", rationale: "Telematics shows front pad life at 12%; historical pattern indicates failure within 600km." },
    { summary: "Auto-replenish brake pads", rationale: "Predicted 30-day demand (84) exceeds current stock (6) plus inbound; lead time 7 days." },
    { summary: "Flag overdue invoice INV-2026-3007", rationale: "Due date passed 6 days ago; customer has reliable payment history, soft reminder advised." },
    { summary: "Reserve parts for WO-2026-1007", rationale: "Work order requires 4 items, all in stock; reserving prevents conflict with pending POs." },
    { summary: "Reschedule appointment due to bay conflict", rationale: "All bays occupied at requested slot; next available aligns with technician specialty." },
    { summary: "Sync 12 invoices to Tally ERP", rationale: "Batch eligible: all paid and reconciled, no anomalies detected." },
  ];
  for (let i = 0; i < count; i++) {
    const a = agents[i % agents.length] as (typeof agents)[number];
    const t = templates[int(0, templates.length - 1)] as (typeof templates)[number];
    list.push({
      id: id("dec", i + 1),
      createdAt: hoursAgo(i + int(0, 1)),
      updatedAt: hoursAgo(i),
      agentKey: a.key,
      agentName: a.name,
      summary: t.summary,
      rationale: t.rationale,
      confidence: round(0.6 + rnd() * 0.39, 2),
      outcome: pick(outcomes),
      workflowKey: chance(0.7) ? "proactive_service" : undefined,
      executionId: chance(0.5) ? id("wf", int(1, 3)) : undefined,
      entityLabel: chance(0.7) ? pick(["Hyundai Creta", "Tata Nexon", "PO-2026-0501", "INV-2026-3007"] as const) : undefined,
    });
  }
  return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

// Agent actions
function buildActions(count: number): AgentAction[] {
  const list: AgentAction[] = [];
  const keys = ["aria", "vault", "cipher"] as const;
  const modules = ["service", "inventory", "finance", "procurement"];
  const descs = [
    "Sent WhatsApp service reminder to customer",
    "Generated cost estimate for brake service",
    "Raised purchase order PO-2026-0501",
    "Reserved 4 parts for work order",
    "Reconciled UPI payment against INV-2026-3004",
    "Booked appointment slot in Bay 3",
    "Synced invoice batch to ERP",
    "Escalated overdue invoice to owner",
  ];
  for (let i = 0; i < count; i++) {
    list.push({
      id: id("actn", i + 1),
      createdAt: hoursAgo(i + int(0, 1)),
      updatedAt: hoursAgo(i),
      agentKey: keys[i % keys.length] as (typeof keys)[number],
      description: descs[int(0, descs.length - 1)] as string,
      status: pick(["success", "success", "success", "pending", "failed"] as const),
      module: modules[int(0, modules.length - 1)] as string,
    });
  }
  return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

// Workflows (proactive_service)
const PROACTIVE_STEPS: ReadonlyArray<{ key: string; name: string; requiresApproval: boolean }> = [
  { key: "detect_brake_wear", name: "Detect brake wear", requiresApproval: false },
  { key: "check_inventory", name: "Check inventory", requiresApproval: false },
  { key: "check_workshop_availability", name: "Check workshop availability", requiresApproval: false },
  { key: "generate_estimate", name: "Generate estimate", requiresApproval: false },
  { key: "customer_approval", name: "Customer approval", requiresApproval: true },
  { key: "create_purchase_order", name: "Create purchase order", requiresApproval: false },
  { key: "reserve_parts", name: "Reserve parts", requiresApproval: false },
  { key: "book_appointment", name: "Book appointment", requiresApproval: false },
  { key: "service_completed", name: "Service completed", requiresApproval: false },
  { key: "invoice_generated", name: "Invoice generated", requiresApproval: false },
  { key: "erp_sync", name: "ERP sync", requiresApproval: false },
];

type WfMode = "waiting_approval" | "failed" | "running";

function buildWorkflows(): WorkflowExecution[] {
  const execs: WorkflowExecution[] = [];
  // 3 executions: 2 waiting_approval, 1 with a failed step.
  const modes: WfMode[] = ["waiting_approval", "waiting_approval", "failed"];
  const labels = ["Hyundai Creta · MH12 AB 4521", "Tata Nexon · KA05 CD 8890", "Maruti Swift · DL10 XY 2231"];

  modes.forEach((mode, mi) => {
    const execId = id("wf", mi + 1);
    const startedOffset = -int(2, 24) * HOUR;
    const steps: WorkflowStep[] = [];

    // Determine the index that is "active".
    const approvalIdx = PROACTIVE_STEPS.findIndex((s) => s.key === "customer_approval");
    const failIdx = PROACTIVE_STEPS.findIndex((s) => s.key === "create_purchase_order");
    const activeIdx = mode === "waiting_approval" ? approvalIdx : failIdx;

    PROACTIVE_STEPS.forEach((s, si) => {
      let status: WorkflowStep["status"];
      let error: string | undefined;
      let startedAt: string | undefined;
      let finishedAt: string | undefined;
      let durationMs: number | undefined;
      let retryCount = 0;

      if (si < activeIdx) {
        status = "succeeded";
        startedAt = iso(startedOffset + si * 4 * MIN);
        durationMs = int(1500, 90000);
        finishedAt = iso(startedOffset + si * 4 * MIN + durationMs);
      } else if (si === activeIdx) {
        if (mode === "waiting_approval") {
          status = "waiting_approval";
          startedAt = iso(startedOffset + si * 4 * MIN);
        } else {
          status = "failed";
          startedAt = iso(startedOffset + si * 4 * MIN);
          durationMs = int(1500, 30000);
          finishedAt = iso(startedOffset + si * 4 * MIN + durationMs);
          error = "Supplier API timeout while creating purchase order (HTTP 504).";
          retryCount = 1;
        }
      } else {
        status = "pending";
      }

      steps.push({
        id: id(`wfs${mi + 1}`, si + 1),
        createdAt: iso(startedOffset),
        updatedAt: iso(startedOffset + si * 4 * MIN),
        executionId: execId,
        key: s.key,
        name: s.name,
        order: si,
        status,
        requiresApproval: s.requiresApproval,
        startedAt,
        finishedAt,
        durationMs,
        output:
          status === "succeeded" ? { ok: true, step: s.key } : undefined,
        error,
        retryCount,
      });
    });

    const succeeded = steps.filter((s) => s.status === "succeeded").length;
    const progressPct = Math.round((succeeded / steps.length) * 100);
    const status: WorkflowExecution["status"] = mode === "waiting_approval" ? "waiting_approval" : "failed";

    execs.push({
      id: execId,
      createdAt: iso(startedOffset),
      updatedAt: iso(-int(1, 60) * MIN),
      definitionKey: "proactive_service",
      title: `Proactive Service · ${labels[mi]}`,
      status,
      triggeredBy: "agent",
      agentId: "agent_aria",
      entityType: "vehicle",
      entityId: id("veh", mi + 1),
      steps,
      currentStepKey: PROACTIVE_STEPS[activeIdx]?.key,
      progressPct,
      startedAt: iso(startedOffset),
      finishedAt: undefined,
    });
  });

  return execs.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

// Approvals derived from waiting_approval executions
function deriveApprovals(workflows: WorkflowExecution[]): ApprovalRequest[] {
  const list: ApprovalRequest[] = [];
  for (const wf of workflows) {
    if (wf.status !== "waiting_approval") continue;
    const step = wf.steps.find((s) => s.status === "waiting_approval");
    if (!step) continue;
    list.push({
      id: id("appr", list.length + 1),
      createdAt: step.startedAt ?? wf.createdAt,
      updatedAt: wf.updatedAt,
      executionId: wf.id,
      workflowTitle: wf.title,
      stepKey: step.key,
      stepName: step.name,
      summary: `Customer approval required for the proposed brake service estimate (₹${int(8, 24)},${int(100, 999)}).`,
      requestedByAgent: "Aria",
      riskLevel: pick(["low", "medium", "high"] as const),
      payload: { estimateRupees: int(8000, 24000), parts: ["Brake Pad Set", "Brake Disc"], laborHours: int(2, 5) },
    });
  }
  return list;
}

// Retry queue derived from failed steps
function deriveRetryQueue(workflows: WorkflowExecution[]): RetryQueueItem[] {
  const list: RetryQueueItem[] = [];
  for (const wf of workflows) {
    const failed = wf.steps.find((s) => s.status === "failed");
    if (!failed) continue;
    list.push({
      id: id("retry", list.length + 1),
      createdAt: failed.finishedAt ?? wf.createdAt,
      updatedAt: wf.updatedAt,
      agentKey: "aria",
      workflowTitle: wf.title,
      stepName: failed.name,
      error: failed.error ?? "Step failed",
      attempts: failed.retryCount,
      maxAttempts: 3,
      nextRetryAt: minutesFromNow(int(2, 30)),
    });
  }
  return list;
}

// --- Assemble the db ---------------------------------------------------------

const customers = buildCustomers(40);
const { vehicles, telematics, predictions } = buildVehicles(customers);
const technicians = buildTechnicians(8);
const bays = buildBays(8, technicians, vehicles);
const appointments = buildAppointments(30, customers, vehicles);
const workOrders = buildWorkOrders(24, customers, vehicles, technicians);
const suppliers = buildSuppliers(10);
const inventory = buildInventory(50, suppliers);
const purchaseOrders = buildPurchaseOrders(18, suppliers, inventory);

// Backfill supplier.activeOrders from open POs.
const OPEN_PO = new Set(["draft", "pending_approval", "approved", "ordered", "partially_received"]);
for (const sup of suppliers) {
  sup.activeOrders = purchaseOrders.filter((po) => po.supplierId === sup.id && OPEN_PO.has(po.status)).length;
}

const { invoices, payments } = buildInvoices(40, customers, workOrders);
const activity = buildActivity(25);
const notifications = buildNotifications();
const agents = buildAgents();
const decisions = buildDecisions(20);
const actions = buildActions(18);
const workflows = buildWorkflows();
const approvals = deriveApprovals(workflows);
const retryQueue = deriveRetryQueue(workflows);

/**
 * The mutable in-memory database. Mutations (approve/reject/toggle/read) mutate
 * these arrays in place so React Query invalidation reflects the change.
 */
export const db = {
  dealershipId: DEALERSHIP_ID,
  customers,
  vehicles,
  telematics,
  predictions,
  technicians,
  bays,
  appointments,
  workOrders,
  suppliers,
  inventory,
  purchaseOrders,
  invoices,
  payments,
  activity,
  notifications,
  agents,
  decisions,
  actions,
  workflows,
  approvals,
  retryQueue,
};

export type Db = typeof db;
