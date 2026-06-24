import { C, SLAB_COLORS, FREE_COLOR } from "../tax/theme.js";
import { taka } from "../tax/format.js";
import { buildSlabBands } from "../tax/compute.js";

const rangeLabel = (start, end) =>
  end === Infinity ? `${taka(start)} & above` : `${taka(start)} – ${taka(end)}`;

/**
 * One rung of the slab ladder. `active` rows (the income reaches this band) are
 * full-strength and show the amount taxed → tax; un-reached bands are dimmed and
 * act as a reference of the rate that *would* apply. The fill bar shows how much
 * of a finite band the income occupies.
 */
function Band({ color, label, rate, amount, width, tax, active, taxFree }) {
  const fill =
    width && width !== Infinity ? Math.min(amount / width, 1) * 100 : active ? 100 : 0;
  return (
    <div className="py-2" style={{ borderBottom: `1px dashed ${C.line}`, opacity: active ? 1 : 0.4 }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-block h-3.5 w-1.5 shrink-0 rounded-sm" style={{ background: color }} />
          <span style={{ color: C.ink }} className="truncate text-sm">
            {label}
          </span>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ background: active ? color : "#eef1ee", color: active && !taxFree ? "#fff" : C.muted }}
        >
          {taxFree ? "Tax-free" : `${(rate * 100).toFixed(0)}%`}
        </span>
      </div>

      {width !== Infinity && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#f0f2f0" }}>
          <div className="h-full rounded-full" style={{ width: `${fill}%`, background: color }} />
        </div>
      )}

      {active && (
        <div className="mt-1 flex items-baseline justify-between">
          <span style={{ color: C.muted }} className="text-xs">
            {taka(amount)} {taxFree ? "tax-free" : "taxed"}
          </span>
          {!taxFree && (
            <span style={{ color: C.ink }} className="text-sm font-mono">
              {taka(tax)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The slab schedule for the selected taxpayer category, doubling as the per-slab
 * gross-tax breakdown. Updates live as category/income change.
 */
export default function SlabSchedule({ categoryLabel, threshold, taxableIncome, grossTax }) {
  const bands = buildSlabBands(threshold, taxableIncome);
  const freeAmount = Math.min(taxableIncome, threshold);

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span style={{ color: C.muted }} className="text-xs font-semibold uppercase tracking-wide">
          Tax slabs · {categoryLabel}
        </span>
        <span style={{ color: C.muted }} className="text-xs">
          Threshold {taka(threshold)}
        </span>
      </div>

      <Band
        color={FREE_COLOR}
        label={`Up to ${taka(threshold)}`}
        rate={0}
        amount={freeAmount}
        width={threshold}
        tax={0}
        active={freeAmount > 0}
        taxFree
      />
      {bands.map((b, i) => (
        <Band
          key={i}
          color={SLAB_COLORS[i]}
          label={rangeLabel(b.start, b.end)}
          rate={b.rate}
          amount={b.amount}
          width={b.width}
          tax={b.tax}
          active={b.amount > 0}
        />
      ))}

      <div className="mt-2 flex items-baseline justify-between py-1.5">
        <span style={{ color: C.ink }} className="text-sm font-semibold">
          Gross tax
        </span>
        <span style={{ color: C.ink }} className="text-sm font-mono font-semibold">
          {taka(grossTax)}
        </span>
      </div>
    </div>
  );
}
