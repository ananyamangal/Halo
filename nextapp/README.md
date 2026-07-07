# SummitBridge Health Plan — Medical Cost Dashboard

A production Next.js 15 (App Router) + React 19 + TypeScript port of the
SummitBridge Health Plan medical-cost analytics dashboard (McKinsey case
competition). All KPIs and charts are recomputed live, client-side, from
`public/data.json` for any filter combination.

## Local development

```bash
npm install        # uses .npmrc legacy-peer-deps=true for React 19 peers
npm run dev        # http://localhost:3000
```

## Data validation

Recomputes the unfiltered KPIs and asserts they match the known-good targets
(member-months 8462, total allowed 11,321,251.82, PMPM 1337.89, ED/1000 142.87,
OON lines 55, IP allowed 8,631,818.26, high-cost concentration 20.5%):

```bash
npm run check
```

## Production build

```bash
npm run build
npm run start      # serves the production build on port 3000
```

## Architecture

- `app/page.tsx` — client component; fetches `/data.json` on mount, holds it in
  state, shows a loading state until ready, and composes the whole dashboard.
  All filter/scenario state via `useState`; metrics recomputed via `useMemo`.
- `components/Chart.tsx` — ECharts wrapper (init, `setOption(option, true)` on
  change, click handler, ResizeObserver + window resize, dispose on unmount).
- `components/ui.tsx` — KPI card, Pill / FilterGroup, Section, Card.
- `lib/compute.ts` — pure port of the original `compute()` aggregation. PMPM and
  per-1,000 denominators use member-month exposure for the selected population;
  category/network filters affect spend and counts only.
- `lib/charts.ts` — one ECharts option builder per chart, ported verbatim
  (palette, tooltips, axes).
- `lib/format.ts`, `lib/types.ts` — formatters and data/filter types.
- `public/data.json` — the dataset (served at `/data.json`).

## Vercel deployment

- Set the project **root directory** to `nextapp`.
- Framework preset is auto-detected as **Next.js**; build command
  `next build`, output handled automatically.
- `.npmrc` (`legacy-peer-deps=true`) is committed so `npm install` resolves the
  React 19 peer ranges cleanly.
