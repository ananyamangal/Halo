/**
 * App-level runtime configuration.
 *
 * USE_MOCK controls whether the data layer runs against the in-memory mock
 * dataset (default) or the live FastAPI backend. Mock is ON by default so the
 * app boots fully standalone with no backend running. Set
 * `NEXT_PUBLIC_USE_MOCK=false` in `.env.local` to use the real API.
 */
export const USE_MOCK = (process.env.NEXT_PUBLIC_USE_MOCK ?? "true") !== "false";
