export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`vera-brand ${small ? "small" : ""}`} aria-label="Vera">
      <svg viewBox="0 0 36 38" fill="none" aria-hidden="true">
        <path d="M3 6h9l8 21-4.5 10L3 6Z" fill="currentColor" />
        <path d="M23 6h10L21 33l-4-10L23 6Z" fill="currentColor" />
      </svg>
      <span>
        vera<span className="brand-period">.</span>
      </span>
    </span>
  );
}
