"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useMember } from "@/lib/member/store";
import { usd } from "@/lib/member/format";
import type { CoverageSummary } from "@/lib/member/store";
import Icon from "@/components/member/Icon";

export default function UploadBillPage() {
  const { uploadBill } = useMember();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [amount, setAmount] = useState("");
  const [providerName, setProviderName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [summary, setSummary] = useState<CoverageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const takeFile = (f: File | undefined) => {
    if (f) setFileName(f.name);
  };

  const submit = () => {
    const amt = Number(amount);
    if (!fileName) { setError("Please select a bill file first."); return; }
    if (!amount.trim() || isNaN(amt) || amt <= 0) { setError("Please enter a valid bill amount."); return; }
    setError(null);
    const result = uploadBill({
      fileName,
      amount: amt,
      providerName: providerName.trim() || undefined,
    });
    setSummary(result);
  };

  const reset = () => {
    setSummary(null);
    setFileName("");
    setAmount("");
    setProviderName("");
    setError(null);
  };

  if (summary) {
    return (
      <>
        <h1 className="page-title">Bill received</h1>
        <p className="page-sub">We&apos;ve added this to your claims and estimated your coverage.</p>

        <div className="mp-card" style={{ maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>Coverage estimate</h3>
            <span className="mp-badge b-amber">Claim status: Processing</span>
          </div>
          <div className="card-sub">Based on your current plan and deductible progress</div>

          <div className="ins-tiles" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="ins-tile">
              <div className="t-label">Total bill amount</div>
              <div className="t-val">{usd(summary.total)}</div>
            </div>
            <div className="ins-tile">
              <div className="t-label">Estimated insurance coverage</div>
              <div className="t-val">{usd(summary.insurancePaid)}</div>
            </div>
            <div className="ins-tile">
              <div className="t-label">Estimated member responsibility</div>
              <div className="t-val">{usd(summary.memberResp)}</div>
            </div>
            <div className="ins-tile">
              <div className="t-label">Deductible applied</div>
              <div className="t-val">{usd(summary.deductibleApplied)}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <Link href="/member/claims" className="mp-btn primary">View in claims</Link>
            <button className="mp-btn outline" onClick={reset}>Upload another bill</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">Upload a medical bill</h1>
      <p className="page-sub">
        Upload a bill and we&apos;ll estimate what your plan covers and what you&apos;ll owe.
      </p>

      <div className="mp-card" style={{ maxWidth: 640 }}>
        <div
          className={"dropzone" + (dragging ? " drag" : "")}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            takeFile(e.dataTransfer.files?.[0]);
          }}
        >
          <div className="dz-ic"><Icon name="upload" size={30} /></div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>
            {fileName ? fileName : "Drag & drop your bill here"}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {fileName ? "Click to choose a different file" : "or click to browse (PDF or image)"}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            style={{ display: "none" }}
            onChange={(e) => takeFile(e.target.files?.[0] ?? undefined)}
          />
        </div>

        <div className="mp-field" style={{ marginTop: 18 }}>
          <label>Bill amount (required)</label>
          <input
            className="mp-input"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            placeholder="e.g. 420.00"
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="mp-field">
          <label>Provider name (optional)</label>
          <input
            className="mp-input"
            value={providerName}
            placeholder="e.g. Riverside Family Clinic"
            onChange={(e) => setProviderName(e.target.value)}
          />
        </div>

        {error && (
          <div className="mp-badge b-red" style={{ marginBottom: 12 }}>{error}</div>
        )}

        <button className="mp-btn primary block" onClick={submit}>Submit bill</button>
      </div>
    </>
  );
}
