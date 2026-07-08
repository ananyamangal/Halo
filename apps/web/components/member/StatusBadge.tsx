import type { ClaimStatus } from "@/lib/member/types";

const MAP: Record<ClaimStatus, string> = {
  Submitted: "b-grey",
  Processing: "b-amber",
  Approved: "b-blue",
  Paid: "b-green",
  Rejected: "b-red",
};

export default function StatusBadge({ status }: { status: ClaimStatus }) {
  return <span className={`mp-badge ${MAP[status]}`}>{status}</span>;
}
