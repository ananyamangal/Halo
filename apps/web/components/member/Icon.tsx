import type { CSSProperties } from "react";

/** Minimal monochrome line-icon set (stroke = currentColor) used across the
 *  member portal in place of emojis. */
const P: Record<string, string[]> = {
  home: ["M3 10.5 12 3l9 7.5", "M5 9.5V21h14V9.5"],
  compass: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M16 8l-2.5 5.5L8 16l2.5-5.5z"],
  stethoscope: ["M6 3v5a5 5 0 0 0 10 0V3", "M11 17.5a4.5 4.5 0 0 0 9 0V15", "M20 13m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"],
  clipboard: ["M9 4h6v2H9z", "M9 5H6v16h12V5h-3", "M9 11h6", "M9 15h6"],
  file: ["M7 3h7l4 4v14H7z", "M14 3v4h4", "M10 13h5", "M10 16h5"],
  monitor: ["M3 5h18v11H3z", "M9 20h6", "M12 16v4"],
  shield: ["M12 3l7 3v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z", "M9 12l2 2 4-4"],
  bell: ["M6 9a6 6 0 0 1 12 0c0 4.5 2 5.5 2 5.5H4S6 13.5 6 9", "M10 19a2 2 0 0 0 4 0"],
  user: ["M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0", "M5 20a7 7 0 0 1 14 0"],
  cross: ["M12 5v14", "M5 12h14"],
  calendar: ["M5 5h14v15H5z", "M8 3v4", "M16 3v4", "M5 10h14"],
  clock: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M12 7v5l3.5 2"],
  receipt: ["M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z", "M9 8h6", "M9 12h6"],
  check: ["M5 12l4 4 10-10"],
  checkCircle: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M8 12l3 3 5-5"],
  upload: ["M12 15V4", "M8 8l4-4 4 4", "M5 15v4h14v-4"],
  pin: ["M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11z", "M12 10m-2.3 0a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0-4.6 0"],
  car: ["M3 13l2-6h14l2 6v4H3z", "M7 17m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0", "M17 17m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0"],
  phone: ["M5 4h4l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"],
  pulse: ["M3 12h4l2.5-6 3.5 12 2.5-6h5"],
  heart: ["M12 20s-7-4.5-7-10a3.7 3.7 0 0 1 7-2 3.7 3.7 0 0 1 7 2c0 5.5-7 10-7 10z"],
  pill: ["M4 12a4 4 0 0 1 4-4h8a4 4 0 0 1 0 8H8a4 4 0 0 1-4-4z", "M12 8v8"],
  thermometer: ["M12 4a2 2 0 0 1 2 2v8a4 4 0 1 1-4 0V6a2 2 0 0 1 2-2z"],
  bandage: ["M4 8.5 8.5 4a4 4 0 0 1 5.6 5.6L9.6 14a4 4 0 0 1-5.6-5.6z", "M9 9l6 6"],
  eye: ["M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z", "M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0"],
  droplet: ["M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3z"],
  alert: ["M12 3l9 16H3z", "M12 10v4", "M12 17.2v.3"],
  info: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M12 11v5", "M12 8v.3"],
  ambulance: ["M3 7h11v9H3z", "M14 10h4l3 3v3h-7", "M6 19m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0", "M17 19m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0", "M8 9v3M6.5 10.5h3"],
  arrowRight: ["M5 12h14", "M13 6l6 6-6 6"],
  arrowLeft: ["M19 12H5", "M11 6l-6 6 6 6"],
  refresh: ["M4 12a8 8 0 0 1 14-5.3L20 8", "M20 4v4h-4", "M20 12a8 8 0 0 1-14 5.3L4 16", "M4 20v-4h4"],
  support: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M4 15h2a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2H4", "M20 15h-2a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h2"],
};

const FILLED = new Set(["starFilled"]);
if (!P.star) P.star = ["M12 3l2.6 5.6 6 .8-4.3 4.2 1 6-5.3-2.9L6.7 18.9l1-6L3.4 9.4l6-.8z"];
if (!P.starFilled) P.starFilled = P.star;

export function Icon({
  name,
  size = 20,
  className,
  style,
  strokeWidth = 1.8,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  const paths = P[name] ?? P.info!;
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export default Icon;
