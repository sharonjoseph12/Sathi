// Professional stroke icon set — replaces emoji iconography.
// 24px, 1.8 stroke, currentColor, aria-hidden by default.
const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Svg({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={P.fill} stroke={P.stroke} strokeWidth={P.strokeWidth}
      strokeLinecap={P.strokeLinecap} strokeLinejoin={P.strokeLinejoin}>
      {children}
    </svg>
  );
}

export const Icon = ({ name, size = 20 }: { name: string; size?: number }) => {
  switch (name) {
    case "home":
      return <Svg size={size}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></Svg>;
    case "pill":
      return <Svg size={size}><rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" /><path d="m9.5 9.5 5 5" /></Svg>;
    case "chat":
      return <Svg size={size}><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" /></Svg>;
    case "users":
      return <Svg size={size}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" /><circle cx="17" cy="9" r="2.6" /><path d="M16 15.2c2.6.3 4.6 1.8 5.3 4.3" /></Svg>;
    case "grid":
      return <Svg size={size}><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></Svg>;
    case "mic":
      return <Svg size={size}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></Svg>;
    case "alert":
      return <Svg size={size}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.5" fill="currentColor" /></Svg>;
    case "pulse":
      return <Svg size={size}><path d="M3 12h4l2.5-6 4 12L16 12h5" /></Svg>;
    case "calendar":
      return <Svg size={size}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Svg>;
    case "chart":
      return <Svg size={size}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-5M12 16V8M16 16v-3M20 16V6" /></Svg>;
    case "scan":
      return <Svg size={size}><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" /><path d="M4 12h16" /></Svg>;
    case "shield":
      return <Svg size={size}><path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-3Z" /><path d="m9.5 12 2 2 3.5-4" /></Svg>;
    case "book":
      return <Svg size={size}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></Svg>;
    case "clock":
      return <Svg size={size}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></Svg>;
    case "file":
      return <Svg size={size}><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></Svg>;
    case "bell":
      return <Svg size={size}><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10" /><path d="M10 19a2 2 0 0 0 4 0" /></Svg>;
    case "gear":
      return <Svg size={size}><circle cx="12" cy="12" r="3" /><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" /></Svg>;
    case "sos":
      return <Svg size={size}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2" /></Svg>;
    case "check":
      return <Svg size={size}><path d="m4.5 12.5 5 5 10-11" /></Svg>;
    case "arrow":
      return <Svg size={size}><path d="M4 12h15M13 6l6 6-6 6" /></Svg>;
    case "logo":
      return <Svg size={size}><path d="M3 12h4l2.5-6 4 12L16 12h5" /><circle cx="12" cy="12" r="9.5" /></Svg>;
    default:
      return <Svg size={size}><circle cx="12" cy="12" r="8.5" /></Svg>;
  }
};
