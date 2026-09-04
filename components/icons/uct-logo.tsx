export function UctLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-8"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="2"
          width="28"
          height="28"
          rx="8"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 22V10h3.2c2.8 0 4.6 1.6 4.6 4.1 0 2.5-1.8 4.1-4.6 4.1H13v3.8H10zm3-6.4h.8c1.2 0 1.9-.6 1.9-1.7s-.7-1.7-1.9-1.7H13v3.4z"
          fill="currentColor"
        />
        <path
          d="M20.5 22l4.5-12h3.2l-4.5 12h-3.2z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
