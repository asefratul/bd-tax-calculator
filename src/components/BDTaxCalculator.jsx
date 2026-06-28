import { useState, useMemo, useEffect, useRef } from "react";
import { compute } from "../tax/compute.js";
import { trackEvent, incomeBand } from "../analytics.js";
import { readShareParams, buildShareUrl } from "../share.js";

// Inputs decoded from the URL once at load, so a shared link restores the state.
const SHARED = readShareParams();
import {
  RULES,
  RULES_BY_YEAR,
  ASSESSMENT_YEARS,
  LATEST_RATES_YEAR,
  FILING_QUARTERS,
  CATEGORIES,
  taxYearFor,
} from "../tax/rules.js";
import { C, SLAB_COLORS, FREE_COLOR } from "../tax/theme.js";
import { taka } from "../tax/format.js";
import MoneyField from "./MoneyField.jsx";
import Toggle from "./Toggle.jsx";
import ReceiptRow from "./ReceiptRow.jsx";
import SlabSchedule from "./SlabSchedule.jsx";
import HowItWorks from "./HowItWorks.jsx";

const INCOME_MODES = [
  { key: "taxable", label: "Taxable income" },
  { key: "gross", label: "Gross salary" },
];

// Short, color-coded hint for a filing quarter, derived from RULES.filing.
// Negative sign = early-filing rebate (green); positive = late-filing fine (red).
function filingHint(key) {
  const f = RULES.filing[key];
  if (!f || f.sign === 0) return { text: "no change", color: C.muted };
  const pct = `${(f.pct * 100).toFixed(0)}%`;
  return f.sign < 0
    ? { text: `−${pct} rebate`, color: C.accent }
    : { text: `+${pct} fine`, color: C.due };
}

export default function BDTaxCalculator() {
  const [income, setIncome] = useState(SHARED.income ?? 900000);
  const [incomeMode, setIncomeMode] = useState(SHARED.incomeMode ?? "taxable");
  const [category, setCategory] = useState(SHARED.category ?? "general");
  const [disabledChild, setDisabledChild] = useState(SHARED.disabledChild ?? false);
  const [newTaxpayer, setNewTaxpayer] = useState(SHARED.newTaxpayer ?? false);
  const [otherIncome, setOtherIncome] = useState(SHARED.otherIncome ?? "");
  const [investment, setInvestment] = useState(SHARED.investment ?? "");
  const [ait, setAit] = useState(SHARED.ait ?? "");
  const [otherAit, setOtherAit] = useState(SHARED.otherAit ?? "");
  const [filingQuarter, setFilingQuarter] = useState(SHARED.filingQuarter ?? "q2");
  const [advanced, setAdvanced] = useState(false);
  const [netWealth, setNetWealth] = useState(SHARED.netWealth ?? 0);
  const [ayStart, setAyStart] = useState(SHARED.ayStart ?? LATEST_RATES_YEAR);
  const [copied, setCopied] = useState(false);

  const incVal = Number(income) || 0;

  // Selected assessment year drives the statement; the other year is computed
  // alongside it for the comparison strip.
  const selectedRules = RULES_BY_YEAR[ayStart];
  const selectedYear = ASSESSMENT_YEARS.find((y) => y.ayStart === ayStart);
  const compareYear = ASSESSMENT_YEARS.find((y) => y.ayStart !== ayStart);

  const inputs = useMemo(
    () => ({
      incomeMode,
      grossSalary: incomeMode === "gross" ? incVal : 0,
      taxableIncome: incomeMode === "taxable" ? incVal : 0,
      otherIncome: Number(otherIncome) || 0,
      category,
      disabledChild,
      newTaxpayer,
      investment: Number(investment) || 0,
      netWealth: Number(netWealth) || 0,
      ait: Number(ait) || 0,
      otherAit: Number(otherAit) || 0,
      filingQuarter,
    }),
    [incomeMode, incVal, otherIncome, category, disabledChild, newTaxpayer, investment, netWealth, ait, otherAit, filingQuarter]
  );

  const r = useMemo(() => compute({ ...inputs, rules: selectedRules }), [inputs, selectedRules]);
  const rCompare = useMemo(
    () => compute({ ...inputs, rules: RULES_BY_YEAR[compareYear.ayStart] }),
    [inputs, compareYear]
  );

  // Keep the URL in sync with the inputs so the result is shareable/bookmarkable.
  const shareState = {
    ayStart, incomeMode, income, otherIncome, category, disabledChild,
    newTaxpayer, investment, ait, otherAit, filingQuarter, netWealth,
  };
  useEffect(() => {
    window.history.replaceState(null, "", buildShareUrl(shareState));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ayStart, incomeMode, income, otherIncome, category, disabledChild, newTaxpayer, investment, ait, otherAit, filingQuarter, netWealth]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(shareState));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      trackEvent("share", { action: "copy_link" });
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  // The slab bar visualises the resolved taxable income (post-exemption in gross mode).
  const segW = (amt) => (r.taxableIncome > 0 ? (amt / r.taxableIncome) * 100 : 0);

  const categoryLabel = CATEGORIES.find((c) => c.key === category)?.label ?? "General";

  // Privacy-safe "calculated" signal: fires (debounced) when the visitor changes
  // their income basis or amount — sends only a coarse band, never the raw figure.
  const firstCalc = useRef(true);
  useEffect(() => {
    if (firstCalc.current) {
      firstCalc.current = false;
      return;
    }
    const id = setTimeout(
      () => trackEvent("calculated", { mode: incomeMode, band: incomeBand(r.taxableIncome) }),
      1500
    );
    return () => clearTimeout(id);
  }, [incomeMode, r.taxableIncome]);

  // Toggle to re-expose the net-wealth surcharge input. The surcharge stays
  // computed (netWealth flows into compute); this only controls its visibility.
  const showSurchargeUI = false;

  // Date-driven tax year (advances each 1 July).
  const ty = taxYearFor();

  // Date-driven year, used only to warn when the calendar has moved past the
  // latest rate set we ship (i.e. the picker is missing the current year).
  const ratesStale = ty.ayStart > LATEST_RATES_YEAR;
  const encodedAyLabel = `AY ${LATEST_RATES_YEAR}–${String(LATEST_RATES_YEAR + 1).slice(-2)}`;

  // Header reflects the selected assessment year (income year is the year before).
  const earnedRange = `Jul ${ayStart - 1} – Jun ${ayStart}`;

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
      className="min-h-screen w-full px-4 py-5"
      style={{
        background: C.paper,
        color: C.ink,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="TaxLagbe logo"
            width="48"
            height="48"
            className="h-12 w-12 shrink-0 rounded-xl"
          />
          <div>
            <h1 className="text-3xl font-bold leading-none tracking-tight" style={{ color: C.accent }}>
              TaxLagbe
            </h1>
            <p className="mt-1 text-sm" style={{ color: C.ink }}>
              Bangladesh income tax, calculated in seconds.
            </p>
            <p style={{ color: C.muted }} className="mt-0.5 text-xs">
              For income earned {earnedRange}
              <span className="ml-2 opacity-70" title={`Assessment Year ${ayStart}–${String(ayStart + 1).slice(-2)}`}>
                · {selectedYear.label}
              </span>
            </p>
          </div>
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

        <div className="grid gap-5 md:grid-cols-2 print:grid-cols-1">
          {/* INPUTS */}
          <section className="rounded-xl p-4 print:hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <h2 style={{ color: C.muted }} className="mb-3 text-xs font-semibold uppercase tracking-wide">
              Your details
            </h2>

            <div className="mb-3">
              <span style={{ color: C.muted }} className="text-xs uppercase tracking-wide">
                Assessment year
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {ASSESSMENT_YEARS.map((yr) => {
                  const on = ayStart === yr.ayStart;
                  return (
                    <button
                      key={yr.ayStart}
                      aria-pressed={on}
                      onClick={() => {
                        setAyStart(yr.ayStart);
                        trackEvent("assessment_year", { ayStart: yr.ayStart });
                      }}
                      className="rounded-md px-3 py-1.5 text-sm transition-colors"
                      style={{
                        border: `1px solid ${on ? C.accent : C.line}`,
                        background: on ? "#f0f7f3" : "#fbfcfb",
                        color: on ? C.accent : C.ink,
                        fontWeight: on ? 600 : 400,
                      }}
                    >
                      {yr.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-3">
              <span style={{ color: C.muted }} className="text-xs uppercase tracking-wide">
                Annual income basis
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {INCOME_MODES.map((m) => {
                  const on = incomeMode === m.key;
                  return (
                    <button
                      key={m.key}
                      aria-pressed={on}
                      onClick={() => {
                        setIncomeMode(m.key);
                        trackEvent("income_mode", { mode: m.key });
                      }}
                      className="rounded-md px-3 py-1.5 text-sm transition-colors"
                      style={{
                        border: `1px solid ${on ? C.accent : C.line}`,
                        background: on ? "#f0f7f3" : "#fbfcfb",
                        color: on ? C.accent : C.ink,
                        fontWeight: on ? 600 : 400,
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <MoneyField
              label={incomeMode === "gross" ? "Annual gross salary" : "Annual taxable income"}
              value={income}
              onChange={setIncome}
              hint={
                incomeMode === "gross"
                  ? `Salary before deductions; the 1/3-or-${taka(
                      selectedRules.employmentExemption.cap
                    )} exemption is applied automatically.`
                  : `Income after allowable exemptions (e.g. the salaried 1/3-or-${taka(
                      selectedRules.employmentExemption.cap
                    )} exclusion).`
              }
            />

            <div className="mt-3">
              <MoneyField
                label="Other income"
                value={otherIncome}
                onChange={setOtherIncome}
                hint="Rent, interest, dividends — net taxable amount, taxed at slab rates."
              />
            </div>

            <div className="mt-3">
              <span style={{ color: C.muted }} className="text-xs uppercase tracking-wide">
                Taxpayer category
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => {
                  const on = category === c.key;
                  return (
                    <button
                      key={c.key}
                      aria-pressed={on}
                      onClick={() => {
                        setCategory(c.key);
                        trackEvent("taxpayer_category", { category: c.key });
                      }}
                      className="rounded-md px-3 py-1.5 text-sm transition-colors"
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

            <div className="mt-3 space-y-1.5">
              <Toggle
                label="Parent / guardian of a child with disability"
                sub="+৳50,000 to the threshold (one parent only)"
                checked={disabledChild}
                onChange={(v) => {
                  setDisabledChild(v);
                  trackEvent("toggle", { name: "disabled_child", on: v });
                }}
              />
              <Toggle
                label="First-time taxpayer"
                sub={
                  selectedRules.minTax.newTaxpayer < selectedRules.minTax.regular
                    ? `Minimum tax floor of ${taka(selectedRules.minTax.newTaxpayer)} instead of ${taka(
                        selectedRules.minTax.regular
                      )}`
                    : "No reduced minimum-tax floor this year"
                }
                checked={newTaxpayer}
                onChange={(v) => {
                  setNewTaxpayer(v);
                  trackEvent("toggle", { name: "first_time_taxpayer", on: v });
                }}
              />
            </div>

            <div className="mt-3">
              <MoneyField
                label="Investment (for tax rebate)"
                value={investment}
                onChange={setInvestment}
                hint="Rebate is 10% of this, but never more than 3% of taxable income."
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <MoneyField
                label="Tax already paid (AIT)"
                value={ait}
                onChange={setAit}
                hint="Salary TDS; refundable if it exceeds the tax."
              />
              <MoneyField
                label="Other AIT"
                value={otherAit}
                onChange={setOtherAit}
                hint="e.g. car AIT (§153); excess not refundable."
              />
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span style={{ color: C.muted }} className="text-xs uppercase tracking-wide">
                  When you file
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: "#fbeeec", color: C.due }}
                  title="Not part of the current NBR rules — shown for illustration only."
                >
                  Illustrative · not an NBR rule
                </span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {FILING_QUARTERS.map((q) => {
                  const on = filingQuarter === q.key;
                  const hint = filingHint(q.key);
                  return (
                    <button
                      key={q.key}
                      aria-pressed={on}
                      onClick={() => {
                        setFilingQuarter(q.key);
                        trackEvent("filing_quarter", { quarter: q.key });
                      }}
                      className="rounded-md px-3 py-1.5 text-sm transition-colors"
                      style={{
                        border: `1px solid ${on ? C.accent : C.line}`,
                        background: on ? "#f0f7f3" : "#fbfcfb",
                        color: on ? C.accent : C.ink,
                        fontWeight: on ? 600 : 400,
                      }}
                    >
                      <span className="block">{q.label}</span>
                      <span className="block text-xs" style={{ color: hint.color, fontWeight: 400 }}>
                        {hint.text}
                      </span>
                    </button>
                  );
                })}
              </div>
              <span style={{ color: C.muted }} className="mt-1 block text-xs">
                This early-filing rebate / late-filing fee is <strong>not in the current NBR rules</strong> —
                shown for illustration only. Pick <strong>Oct–Dec</strong> to leave it out of your estimate.
                (Actual late filing incurs simple interest under §174, not a flat percentage.)
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
          <section className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 style={{ color: C.muted }} className="text-xs font-semibold uppercase tracking-wide">
                Estimated tax payable
              </h2>
              <div className="flex gap-1.5 print:hidden">
                <button
                  onClick={copyShareLink}
                  className="rounded-md px-2 py-1 text-xs transition-colors"
                  style={{ border: `1px solid ${C.line}`, color: C.accent, background: "#fbfcfb" }}
                >
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
                <button
                  onClick={() => {
                    trackEvent("share", { action: "print" });
                    window.print();
                  }}
                  className="rounded-md px-2 py-1 text-xs transition-colors"
                  style={{ border: `1px solid ${C.line}`, color: C.accent, background: "#fbfcfb" }}
                >
                  Print
                </button>
              </div>
            </div>
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

            {(() => {
              const diff = Math.round(r.totalDue - rCompare.totalDue);
              const up = diff > 0;
              return (
                <div style={{ color: C.muted }} className="mt-1.5 text-xs">
                  vs {compareYear.label}:{" "}
                  <span className="font-mono" style={{ color: C.ink }}>
                    {taka(rCompare.totalDue)}
                  </span>
                  {diff === 0 ? (
                    <span className="ml-1">· same</span>
                  ) : (
                    <span className="ml-1 font-semibold" style={{ color: up ? C.due : C.accent }}>
                      {up ? "▲" : "▼"} {taka(Math.abs(diff))} {up ? "more" : "less"}
                    </span>
                  )}
                </div>
              );
            })()}

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
              {(r.incomeMode === "gross" || r.otherIncome > 0) && (
                <div className="mb-2">
                  {r.incomeMode === "gross" && (
                    <>
                      <ReceiptRow label="Gross salary" value={incVal} />
                      <ReceiptRow label="Employment exemption" value={r.exemption} color={C.accent} neg />
                      <ReceiptRow
                        label={r.otherIncome > 0 ? "Salary (taxable)" : "Taxable income"}
                        value={r.baseTaxable}
                        strong={r.otherIncome === 0}
                      />
                    </>
                  )}
                  {r.incomeMode === "taxable" && r.otherIncome > 0 && (
                    <ReceiptRow label="Taxable income (entered)" value={r.baseTaxable} />
                  )}
                  {r.otherIncome > 0 && (
                    <>
                      <ReceiptRow label="Other income" value={r.otherIncome} />
                      <ReceiptRow label="Total taxable income" value={r.taxableIncome} strong />
                    </>
                  )}
                </div>
              )}
              <SlabSchedule
                categoryLabel={categoryLabel}
                threshold={r.threshold}
                taxableIncome={r.taxableIncome}
                grossTax={r.grossTax}
                slabs={selectedRules.slabs}
              />

              <div className="mt-2">
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
                    {r.nonRefundableAit > 0 ? (
                      <>
                        {r.refundableAit > 0 && (
                          <ReceiptRow label="Tax already paid (AIT)" value={r.refundableAit} color={C.accent} neg />
                        )}
                        <ReceiptRow label="Other AIT (non-refundable)" value={r.nonRefundableAit} color={C.accent} neg />
                      </>
                    ) : (
                      <ReceiptRow label="Tax already paid (AIT)" value={r.paid} color={C.accent} neg />
                    )}
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
                  {r.forfeited > 0 && (
                    <p style={{ color: C.muted }} className="mt-2 text-xs">
                      {taka(r.forfeited)} of the Other AIT exceeds the tax and is not refundable
                      (Section 153).
                    </p>
                  )}
                </>
              )}

              {r.minApplied && (
                <p style={{ color: C.muted }} className="mt-2 text-xs">
                  Tax after rebate came to {taka(r.afterRebate)}; since income exceeds the threshold,
                  the {taka(r.floor)} minimum applies.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="print:hidden">
          <HowItWorks rules={selectedRules} />
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
