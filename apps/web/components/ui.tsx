"use client";

import React from "react";

// KPI card
export function KpiCard({
  label,
  value,
  sub,
  chip,
}: {
  label: string;
  value: string;
  sub: string;
  chip?: [string, string];
}) {
  return (
    <div className="kpi">
      <div className="k-label">{label}</div>
      <div className="k-value">{value}</div>
      <div className="k-sub">
        {sub}
        {chip ? (
          <>
            {" "}
            <span className={`k-chip ${chip[0]}`}>{chip[1]}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

// A single filter pill
export function Pill({
  label,
  active,
  blue,
  onClick,
}: {
  label: string;
  active: boolean;
  blue?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={
        "pill" + (blue ? " blue" : "") + (active ? " active" : "")
      }
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// A labelled group of pills
export function FilterGroup({
  label,
  values,
  active,
  onToggle,
  labelFn,
  blue,
  style,
}: {
  label: string;
  values: string[];
  active: Set<string>;
  onToggle: (v: string) => void;
  labelFn?: (v: string) => string;
  blue?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className="fgroup" style={style}>
      <label>{label}</label>
      <div className="pills">
        {values.map((v) => (
          <Pill
            key={v}
            label={labelFn ? labelFn(v) : v}
            active={active.has(v)}
            blue={blue}
            onClick={() => onToggle(v)}
          />
        ))}
      </div>
    </div>
  );
}

// Compact multi-select dropdown filter
export function FilterSelect({
  label,
  values,
  active,
  onToggle,
  labelFn,
}: {
  label: string;
  values: string[];
  active: Set<string>;
  onToggle: (v: string) => void;
  labelFn?: (v: string) => string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const count = active.size;
  const first = [...active][0];
  const summary =
    count === 0
      ? "All"
      : count === 1 && first
        ? labelFn
          ? labelFn(first)
          : first
        : `${count} selected`;

  return (
    <div className="fdrop" ref={ref}>
      <button
        className={"fdrop-btn" + (count ? " has" : "")}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="fd-label">{label}</span>
        <span className="fd-val">{summary}</span>
        <span className="fd-caret">▾</span>
      </button>
      {open && (
        <div className="fdrop-menu">
          {values.map((v) => {
            const on = active.has(v);
            return (
              <button
                key={v}
                className={"fdrop-opt" + (on ? " on" : "")}
                onClick={() => onToggle(v)}
              >
                <span className="cbx">{on ? "✓" : ""}</span>
                {labelFn ? labelFn(v) : v}
              </button>
            );
          })}
          {count > 0 && (
            <button
              className="fdrop-clear"
              onClick={() => [...active].forEach((v) => onToggle(v))}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Section heading (tag 01-06 + rule)
export function Section({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <div className="section-title">
      <span className="tag">{tag}</span> {children} <span className="rule"></span>
    </div>
  );
}

// Chart card wrapper
export function Card({
  title,
  sub,
  tall,
  children,
}: {
  title: string;
  sub?: string;
  tall?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {sub ? <div className="c-sub">{sub}</div> : null}
      {children}
    </div>
  );
}
