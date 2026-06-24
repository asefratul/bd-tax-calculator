import { useState, useMemo, useEffect } from "react";
import { compute } from "../tax/compute.js";
import { RULES, FILING_QUARTERS, CATEGORIES, taxYearFor } from "../tax/rules.js";
import { C, SLAB_COLORS, FREE_COLOR } from "../tax/theme.js";
import { taka } from "../tax/format.js";
import MoneyField from "./MoneyField.jsx";
import Toggle from "./Toggle.jsx";
import ReceiptRow from "./ReceiptRow.jsx";

export default function BDTaxCalculator() {
  const [income, setIncome] = useState(900000);
  const [category, setCategory] = useState("general");
  const [disabledChild, setDisabledChild] = useState(false);
  const [newTaxpayer, setNewTaxpayer] = useState(false);
  const [investment, setInvestment] = useState("");
  const [ait, setAit] = useState("");
  const [filingQuarter, setFilingQuarter] = useState("q2");
  const [advanced, setAdvanced] = useState(false);
  const [netWealth, setNetWealth] = useState(0);

  const r = useMemo(
    () =>
      compute({
        taxableIncome: Number(income) || 0,
        category,
        disabledChild,
        newTaxpayer,
        investment: Number(investment) || 0,
        netWealth: Number(netWealth) || 0,
        ait: Number(ait) || 0,
        filingQuarter,
      }),
    [income, category, disabledChild, newTaxpayer, investment, netWealth, ait, filingQuarter]
  );

  const inc = Number(income) || 0;
  const segW = (amt) => (inc > 0 ? (amt / inc) * 100 : 0);

  // Toggle to re-expose the net-wealth surcharge input. The surcharge stays
  // computed (netWealth flows into compute); this only controls its visibility.
  const showSurchargeUI = false;

  // Date-driven tax year (advances each 1 July).
  const ty = taxYearFor();

  // The displayed year advances automatically on 1 July; the encoded rates do not.
  // When they diverge, the header is claiming a tax year the numbers don't cover.
  const ratesStale = ty.ayStart !== RULES.ratesAssessmentYearStart;
  const encodedAyLabel = `AY ${RULES.ratesAssessmentYearStart}–${String(
    RULES.ratesAssessmentYearStart + 1
  ).slice(-2)}`;

  // Dev-time guard mirrors the on-screen banner below.
  useEffect(() => {
    if (import.meta.env?.DEV && ratesStale) {
      console.warn(
        `[TaxLagbe] Showing ${ty.ayLabel}, but rates in src/tax/rules.js encode ` +
          `${encodedAyLabel}. Update the constants for the new Finance Act.`
      );
    }
  }, [ratesStale, ty.ayLabel, encodedAyLabel]);

  return (
    <div
      className="min-h-screen w-full px-4 py-8"
      style={{
        background: C.paper,
        color: C.ink,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: C.accent }}>
            TaxLagbe
          </h1>
          <p className="mt-1 text-sm" style={{ color: C.ink }}>
            Bangladesh income tax, calculated in seconds.
          </p>
          <p style={{ color: C.muted }} className="mt-0.5 text-xs">
            For income earned {ty.earnedRange}
            <span className="ml-2 opacity-70" title={`Assessment Year ${ty.ayStart}–${String(ty.ayEnd).slice(-2)}`}>
              · {ty.ayLabel}
            </span>
          </p>
        </header>

        {ratesStale && (
          <div
            role="alert"
            className="mb-5 rounded-md px-4 py-3 text-sm"
            style={{ background: "#fbeeec", border: `1px solid ${C.due}`, color: C.due }}
          >
            <strong>Rates may be out of date.</strong> The figures here encode {encodedAyLabel}, but
            this period falls in {ty.ayLabel}. Verify against the current Finance Act before relying
            on these numbers.
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {/* INPUTS */}
          <section className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <h2 style={{ color: C.muted }} className="mb-4 text-xs font-semibold uppercase tracking-wide">
              Your details
            </h2>

            <MoneyField
              label="Annual taxable income"
              value={income}
              onChange={setIncome}
              hint="Total income after allowable exemptions (e.g. the salaried 1/3-or-৳450,000 exclusion)."
            />

            <div className="mt-4">
              <span style={{ color: C.muted }} className="text-xs uppercase tracking-wide">
                Taxpayer category
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => {
                  const on = category === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setCategory(c.key)}
                      className="rounded-md px-3 py-2 text-sm transition-colors"
                      style={{
                        border: `1px solid ${on ? C.accent : C.line}`,
                        background: on ? "#f0f7f3" : "#fbfcfb",
                        color: on ? C.accent : C.ink,
                        fontWeight: on ? 600 : 400,
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <span style={{ color: C.muted }} className="mt-1 block text-xs">
                Threshold in effect: <strong style={{ color: C.ink }}>{taka(r.threshold)}</strong>
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <Toggle
                label="Parent / guardian of a child with disability"
                sub="+৳50,000 to the threshold (one parent only)"
                checked={disabledChild}
                onChange={setDisabledChild}
              />
              <Toggle
                label="First-time taxpayer"
                sub="Minimum tax floor of ৳1,000 instead of ৳5,000"
                checked={newTaxpayer}
                onChange={setNewTaxpayer}
              />
            </div>

            <div className="mt-4">
              <MoneyField
                label="Eligible investment"
                value={investment}
                onChange={setInvestment}
                hint="Rebate is 10% of this, but never more than 3% of taxable income."
              />
            </div>

            <div className="mt-4">
              <MoneyField
                label="Tax already paid (AIT)"
                value={ait}
                onChange={setAit}
                hint="Advance income tax deducted at source from salary during the year."
              />
            </div>

            <div className="mt-4">
              <span style={{ color: C.muted }} className="text-xs uppercase tracking-wide">
                When you file
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {FILING_QUARTERS.map((q) => {
                  const on = filingQuarter === q.key;
                  return (
                    <button
                      key={q.key}
                      onClick={() => setFilingQuarter(q.key)}
                      className="rounded-md px-3 py-2 text-sm transition-colors"
                      style={{
                        border: `1px solid ${on ? C.accent : C.line}`,
                        background: on ? "#f0f7f3" : "#fbfcfb",
                        color: on ? C.accent : C.ink,
                        fontWeight: on ? 600 : 400,
                      }}
                    >
                      {q.label}
                    </button>
                  );
                })}
              </div>
              <span style={{ color: C.muted }} className="mt-1 block text-xs">
                Filing Jul–Sep earns a rebate; filing after December adds to the tax.
              </span>
            </div>

            {/* Net-wealth surcharge UI is hidden for now. The surcharge logic stays
                wired through compute(); flip showSurchargeUI to true to re-expose it. */}
            {showSurchargeUI && (
              <>
                <button
                  onClick={() => setAdvanced(!advanced)}
                  className="mt-4 text-sm"
                  style={{ color: C.accent }}
                >
                  {advanced ? "− Hide" : "+ Add"} net-wealth surcharge
                </button>
                {advanced && (
                  <div className="mt-2">
                    <MoneyField
                      label="Net wealth"
                      value={netWealth}
                      onChange={setNetWealth}
                      hint="Surcharge on tax kicks in above ৳4 crore."
                    />
                  </div>
                )}
              </>
            )}
          </section>

          {/* STATEMENT */}
          <section className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <h2 style={{ color: C.muted }} className="mb-1 text-xs font-semibold uppercase tracking-wide">
              Estimated tax payable
            </h2>
            <div className="flex items-end gap-3">
              <div
                className="text-4xl font-bold font-mono"
                style={{ color: r.totalDue > 0 ? C.due : C.accent }}
              >
                {taka(r.totalDue)}
              </div>
              <div style={{ color: C.muted }} className="pb-1.5 text-sm">
                {(r.effective * 100).toFixed(1)}% effective
              </div>
            </div>

            {/* stacked slab bar */}
            <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full" style={{ background: "#f0f2f0" }}>
              <div style={{ width: `${segW(r.taxFreePortion)}%`, background: FREE_COLOR }} title="Tax-free" />
              {r.breakdown.map((b, i) => (
                <div
                  key={i}
                  style={{ width: `${segW(b.amount)}%`, background: SLAB_COLORS[i] }}
                  title={`${(b.rate * 100).toFixed(0)}% slab`}
                />
              ))}
            </div>

            {/* receipt */}
            <div className="mt-5">
              <ReceiptRow label={`Tax-free (${taka(r.threshold)})`} value={r.taxFreePortion} color={C.muted} />
              {r.breakdown.map((b, i) => (
                <ReceiptRow key={i} label={`${(b.rate * 100).toFixed(0)}% on ${taka(b.amount)}`} value={b.tax} />
              ))}
              {r.breakdown.length === 0 && (
                <div style={{ color: C.muted }} className="py-2 text-sm">
                  Income is within the tax-free threshold.
                </div>
              )}

              <div className="mt-2">
                <ReceiptRow label="Gross tax" value={r.grossTax} strong />
                {r.rebate > 0 && <ReceiptRow label="Investment rebate" value={r.rebate} color={C.accent} neg />}
                {r.minApplied && <ReceiptRow label="Minimum tax floor applied" value={r.floor} color={C.due} />}
                {r.surcharge > 0 && (
                  <ReceiptRow
                    label={`Net-wealth surcharge (${(r.surchargeRate * 100).toFixed(0)}%)`}
                    value={r.surcharge}
                  />
                )}
                {r.filingAdj !== 0 && <ReceiptRow label="Tax assessed" value={r.total} strong />}
                {r.filingAdj < 0 && (
                  <ReceiptRow label="Early-filing rebate (Jul–Sep)" value={-r.filingAdj} color={C.accent} neg />
                )}
                {r.filingAdj > 0 && (
                  <ReceiptRow
                    label={
                      filingQuarter === "q4"
                        ? "Late-filing surcharge (Apr–Jun)"
                        : "Late-filing surcharge (Jan–Mar)"
                    }
                    value={r.filingAdj}
                    color={C.due}
                  />
                )}
              </div>

              <div
                className="mt-3 flex items-baseline justify-between rounded-md px-3 py-3"
                style={{ background: "#f0f7f3" }}
              >
                <span style={{ color: C.ink }} className="font-semibold">
                  Total payable
                </span>
                <span
                  className="text-lg font-mono"
                  style={{ color: r.totalDue > 0 ? C.due : C.accent, fontWeight: 700 }}
                >
                  {taka(r.totalDue)}
                </span>
              </div>

              {r.paid > 0 && (
                <>
                  <div className="mt-3">
                    <ReceiptRow label="Tax already paid (AIT)" value={r.paid} color={C.accent} neg />
                  </div>
                  <div
                    className="mt-3 flex items-baseline justify-between rounded-md px-3 py-3"
                    style={{
                      background: r.refund ? "#eef6f1" : "#fbeeec",
                      border: `1px solid ${r.refund ? C.accent : C.due}`,
                    }}
                  >
                    <span style={{ color: C.ink }} className="font-semibold">
                      {r.refund ? "Refundable" : "Net payable"}
                    </span>
                    <span
                      className="text-lg font-mono"
                      style={{ color: r.refund ? C.accent : C.due, fontWeight: 700 }}
                    >
                      {taka(Math.abs(r.net))}
                    </span>
                  </div>
                </>
              )}

              {r.minApplied && (
                <p style={{ color: C.muted }} className="mt-2 text-xs">
                  Slab tax came to {taka(r.afterRebate)}; since income exceeds the threshold, the{" "}
                  {taka(r.floor)} minimum applies.
                </p>
              )}
            </div>
          </section>
        </div>

        <footer style={{ color: C.muted }} className="mx-auto mt-6 max-w-5xl text-xs leading-relaxed">
          Estimate based on the FY2026–27 budget. Figures are proposed until the Finance Act 2026 is gazetted —
          verify rates, the rebate ceiling, and exemption rules against the final act and NBR circulars before
          filing. This is not tax advice.
        </footer>
      </div>
    </div>
  );
}
