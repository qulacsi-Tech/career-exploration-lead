/**
 * Stand-in for a real photo/logo asset. Same box shape, background and corner
 * radius the final image will use — swap in a real `<Image>` when assets land,
 * no layout changes needed.
 */
export function ImagePlaceholder({
  className = "",
  label,
  rounded = "rounded-none",
}: {
  className?: string;
  label?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-bg-alt text-ink-faint ${rounded} ${className}`}
      role="img"
      aria-label={label ?? "Image placeholder"}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 opacity-40">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M21 16l-5.5-5.5a1.5 1.5 0 00-2.12 0L4 19" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
