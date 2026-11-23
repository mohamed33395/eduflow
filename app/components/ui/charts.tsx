import { cn } from "@/app/lib/utils";

/**
 * Lightweight dependency-free charts in the reference palette
 * (deep teal / gold / neutrals). Server-component safe.
 */

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  data: DonutSegment[];
  /** Big number in the hole — defaults to the sum of values. */
  centerValue?: string | number;
  centerLabel?: string;
  size?: number;
  className?: string;
}

const DONUT_PALETTE = ["#0f766e", "#d9a441", "#94a3b8", "#6366f1", "#dc2626"];

export function DonutChart({
  data,
  centerValue,
  centerLabel,
  size = 160,
  className,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 56;
  const C = 2 * Math.PI * r;

  const fracs = data.map((d) => (total > 0 ? d.value / total : 0));
  const slices = data.map((d, i) => {
    const startOffset = fracs.slice(0, i).reduce((a, b) => a + b, 0);
    return {
      ...d,
      color: d.color ?? DONUT_PALETTE[i % DONUT_PALETTE.length],
      dasharray: `${fracs[i] * C} ${C - fracs[i] * C}`,
      dashoffset: -startOffset * C,
    };
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-6", className)}>
      <svg
        viewBox="0 0 140 140"
        width={size}
        height={size}
        role="img"
        aria-label={centerLabel ?? "chart"}
      >
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="18" className="dark:stroke-slate-700" />
        {total > 0 &&
          slices.map((s, i) => (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              strokeLinecap={slices.length > 1 ? "butt" : "round"}
              transform="rotate(-90 70 70)"
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          ))}
        <text
          x="70"
          y={centerLabel ? 66 : 72}
          textAnchor="middle"
          className="fill-slate-900 text-2xl font-bold dark:fill-white"
        >
          {centerValue ?? total}
        </text>
        {centerLabel && (
          <text
            x="70"
            y="86"
            textAnchor="middle"
            className="fill-slate-500 text-[11px] dark:fill-slate-400"
          >
            {centerLabel}
          </text>
        )}
      </svg>

      <ul className="min-w-[8rem] flex-1 space-y-2 text-sm">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ms-auto font-semibold text-foreground">
              {s.value}
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                ({total > 0 ? Math.round((s.value / total) * 100) : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarDatum[];
  /** Optional formatter shown as the bar tooltip. */
  formatValue?: (value: number) => string;
  className?: string;
}

export function BarChart({ data, formatValue, className }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("w-full", className)}>
      <div className="flex h-44 items-end gap-3 border-b border-border px-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="group relative flex-1 rounded-t-md bg-emerald-800 transition-colors hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            style={{
              height: `${Math.max((d.value / max) * 100, d.value > 0 ? 6 : 1.5)}%`,
            }}
            title={formatValue ? formatValue(d.value) : String(d.value)}
          >
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-200 dark:text-slate-900">
              {formatValue ? formatValue(d.value) : d.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 px-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 truncate text-center text-xs text-muted-foreground"
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface TrendSeries {
  label: string;
  color: string;
  /** One value per label. */
  values: number[];
}

export interface TrendChartProps {
  labels: string[];
  series: TrendSeries[];
  formatValue?: (value: number) => string;
  className?: string;
}

/** Smooth (Catmull-Rom → cubic Bézier) path through the given points. */
function smoothLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length < 3) {
    return `M ${pts.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  }
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/**
 * Smooth multi-series line/area chart (dependency-free SVG).
 * Used for monthly paid-vs-unpaid comparisons.
 */
export function TrendChart({
  labels,
  series,
  formatValue,
  className,
}: TrendChartProps) {
  const W = 720;
  const H = 190;
  const PAD_X = 12;
  const PAD_T = 16;
  const PAD_B = 10;
  const n = labels.length;
  const max = Math.max(1, ...series.flatMap((s) => s.values));

  const x = (i: number) =>
    n <= 1 ? W / 2 : PAD_X + (i * (W - PAD_X * 2)) / (n - 1);
  const y = (v: number) => H - PAD_B - (v / max) * (H - PAD_T - PAD_B);
  const baseline = y(0);
  const gridFracs = [0.5, 1];

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="trend chart"
      >
        {/* gridlines + baseline */}
        {gridFracs.map((f) => (
          <line
            key={f}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={y(max * f)}
            y2={y(max * f)}
            stroke="#e2e8f0"
            strokeDasharray="4 5"
            strokeWidth="1"
            className="dark:stroke-slate-700"
          />
        ))}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={baseline}
          y2={baseline}
          stroke="#cbd5e1"
          strokeWidth="1"
          className="dark:stroke-slate-600"
        />

        {series.map((s) => {
          const pts = s.values.map((v, i) => ({ x: x(i), y: y(v) }));
          if (pts.length === 0) return null;
          const line = smoothLinePath(pts);
          const area =
            n > 1
              ? `${line} L ${pts[pts.length - 1].x},${baseline} L ${pts[0].x},${baseline} Z`
              : "";
          return (
            <g key={s.label}>
              {area && (
                <path d={area} fill={s.color} fillOpacity={0.09} />
              )}
              {n > 1 && (
                <path
                  d={line}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              )}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  className="dark:stroke-slate-900"
                >
                  <title>{`${s.label} · ${labels[i]}: ${
                    formatValue ? formatValue(s.values[i]) : s.values[i]
                  }`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      {/* x labels */}
      <div className="mt-2 flex gap-3 px-1">
        {labels.map((l, i) => (
          <div
            key={i}
            className="flex-1 truncate text-center text-xs text-muted-foreground"
          >
            {l}
          </div>
        ))}
      </div>

      {/* legend */}
      {series.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
