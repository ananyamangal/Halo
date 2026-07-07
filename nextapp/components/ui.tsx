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
