// The CreatorsAI brand mark — a coral "C" cradling a bone spark dot.
// Single source of truth shared with favicon.svg / app icons. Transparent
// background so it sits on the ink UI.
export default function Logo({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M45.4 46.86 A20 20 0 1 1 45.4 17.14"
        stroke="#ff5436"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="34.24" cy="32" r="5.44" fill="#f4ede1" />
    </svg>
  );
}
