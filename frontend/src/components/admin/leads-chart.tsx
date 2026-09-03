/**
 * Daily enquiry volume — a single-series bar chart, drawn as plain SVG.
 *
 * Bars because the measure is a count per discrete day; a line would imply a
 * continuous quantity sampled at those points. One series, so there is no
 * legend — the section title names it — and no categorical palette to validate:
 * every bar is the same brand hue, because the colour carries no meaning here
 * beyond "this is the data".
 *
 * Server component: everything it needs is static, and the per-bar tooltip is a
 * native SVG <title>, so no client JS ships for it.
 */
export function LeadsChart({ data }: { data: { date: string; count: number }[] }) {
  const width = 720;
  const height = 200;
  const padding = { top: 16, right: 8, bottom: 26, left: 32 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.count));
  // Round the axis up to a clean step so the gridlines read as round numbers.
  const step = max <= 20 ? 5 : max <= 50 ? 10 : 25;
  const axisMax = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: axisMax / step + 1 }, (_, i) => i * step);

  // Thin marks: capped rather than filling the slot, which at 14 bars across
  // 680px would give 46px-wide blocks. 2px of surface between neighbours.
  const slot = plotWidth / data.length;
  const barWidth = Math.min(slot - 2, 26);
  const radius = 4;

  const peakIndex = data.findIndex((d) => d.count === max);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Enquiries per day over the last ${data.length} days. Peak of ${max} on ${data[peakIndex].date}.`}
      >
        {/* Recessive gridlines and value axis. */}
        {ticks.map((tick) => {
          const y = padding.top + plotHeight - (tick / axisMax) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-[var(--color-ink-faint)] text-[10px]"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {data.map((entry, index) => {
          const barHeight = (entry.count / axisMax) * plotHeight;
          // Centred in its slot so the spacing stays even once capped.
          const x = padding.left + index * slot + (slot - barWidth) / 2;
          const y = padding.top + plotHeight - barHeight;
          const r = Math.min(radius, barHeight);

          // Rounded top only: the bar stays anchored square to the baseline.
          const path = [
            `M ${x} ${y + barHeight}`,
            `L ${x} ${y + r}`,
            `Q ${x} ${y} ${x + r} ${y}`,
            `L ${x + barWidth - r} ${y}`,
            `Q ${x + barWidth} ${y} ${x + barWidth} ${y + r}`,
            `L ${x + barWidth} ${y + barHeight}`,
            "Z",
          ].join(" ");

          return (
            <g key={entry.date}>
              <path d={path} fill="var(--color-brand)" />
              {/* Native tooltip: hover detail without shipping a client bundle. */}
              <title>{`${entry.date}: ${entry.count} enquiries`}</title>

              {/* Label the peak only — a number on every bar is noise. */}
              {index === peakIndex && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-[var(--color-ink)] text-[10px] font-semibold"
                >
                  {entry.count}
                </text>
              )}

              {/* First, last and midpoint only, so the axis does not crowd. */}
              {(index === 0 || index === data.length - 1 || index === Math.floor(data.length / 2)) && (
                <text
                  x={x + barWidth / 2}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-[var(--color-ink-faint)] text-[10px]"
                >
                  {entry.date}
                </text>
              )}
            </g>
          );
        })}

        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + plotHeight}
          y2={padding.top + plotHeight}
          stroke="var(--color-line)"
          strokeWidth="1"
        />
      </svg>

      {/* The same numbers as a table, for screen readers and anyone who wants
          the values rather than the shape. */}
      <table className="sr-only">
        <caption>Enquiries per day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Enquiries</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.date}>
              <th scope="row">{entry.date}</th>
              <td>{entry.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * Lead sources as horizontal magnitude bars.
 *
 * Not a pie: comparing five slice angles is harder than comparing five bar
 * lengths, and the labels have nowhere to sit. One hue throughout — the bars
 * encode magnitude, not identity, so varying the colour would imply a
 * distinction that is not in the data.
 */
export function SourceBars({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <ul className="space-y-3">
      {data.map((entry) => (
        <li key={entry.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink">{entry.label}</span>
            <span className="shrink-0 tabular-nums text-ink-soft">
              {entry.count}
              <span className="ml-1.5 text-xs text-ink-faint">
                {Math.round((entry.count / total) * 100)}%
              </span>
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-bg-alt">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(entry.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
