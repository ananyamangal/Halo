// Formatters ported verbatim from app.js

export const money = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + Math.round(n).toLocaleString();
};

export const money0 = (n: number): string =>
  "$" + Math.round(n).toLocaleString();

export const num = (n: number): string => Math.round(n).toLocaleString();

export const pct = (n: number, d = 1): string => n.toFixed(d) + "%";

const MONTH_LBL: Record<string, string> = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dec",
};

export const mlbl = (ym: string): string => MONTH_LBL[ym.slice(5)] || ym;
