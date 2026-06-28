/* ============================================================
   TAX RULES — Bangladesh individual income tax.

   Each assessment year is a self-contained rate set; compute()
   takes one via its `rules` param (defaulting to the latest).
   Numbers are from the NBR Income Tax Paripatra 2025–26
   (AY 2026–27 in Section 1, AY 2025–26 in Section 2) and remain
   PROPOSED until the Finance Act is gazetted. Edit the constants
   here, not the logic in compute.js.
   ============================================================ */

// Taxpayer categories and filing quarters are shared across years.
export const CATEGORIES = [
  { key: "general", label: "General" },
  { key: "womenSenior", label: "Woman / 65+" },
  { key: "disabledThirdGender", label: "Disability / third gender" },
  { key: "freedomFighter", label: "Freedom fighter" },
];

export const FILING_QUARTERS = [
  { key: "q1", label: "Jul–Sep" },
  { key: "q2", label: "Oct–Dec" },
  { key: "q3", label: "Jan–Mar" },
  { key: "q4", label: "Apr–Jun" },
];

// Illustrative filing-time adjustment — NOT a statutory NBR provision (the UI
// flags it). Shared across years. "lower"/"higher" picks pct×tax vs the bound.
const FILING = {
  q1: { sign: -1, pct: 0.05, bound: 25000, mode: "lower" }, // Jul–Sep
  q2: { sign: 0, pct: 0, bound: 0, mode: "none" }, // Oct–Dec
  q3: { sign: 1, pct: 0.02, bound: 3000, mode: "higher" }, // Jan–Mar
  q4: { sign: 1, pct: 0.05, bound: 5000, mode: "higher" }, // Apr–Jun
};

// Net-wealth surcharge tiers (Paripatra 2025–26): 0 / 10 / 20 / 30 / 35%.
const SURCHARGE = [
  { upTo: 40000000, rate: 0 }, // up to ৳4 crore
  { upTo: 100000000, rate: 0.1 }, // ৳4–10 crore
  { upTo: 200000000, rate: 0.2 }, // ৳10–20 crore
  { upTo: 500000000, rate: 0.3 }, // ৳20–50 crore
  { upTo: Infinity, rate: 0.35 }, // above ৳50 crore
];

// AY 2026–27 (income year 2025–26) — Paripatra 2025–26, Section 1.
const AY2026 = {
  ayStart: 2026,
  thresholds: {
    general: 375000,
    womenSenior: 425000, // women, and anyone aged 65+
    disabledThirdGender: 500000, // persons with disability / third gender
    freedomFighter: 525000, // gazetted war-wounded FF & "July Warriors 2024"
  },
  disabledChildBonus: 50000,
  // Finance Ordinance 2025 raised the salaried exemption cap to ৳5,00,000.
  employmentExemption: { fraction: 1 / 3, cap: 500000 },
  slabs: [
    { width: 300000, rate: 0.1 },
    { width: 400000, rate: 0.15 },
    { width: 500000, rate: 0.2 },
    { width: 2000000, rate: 0.25 },
    { width: Infinity, rate: 0.3 },
  ],
  // Flat ৳5,000 (৳1,000 for new taxpayers); AY 2026–27 dropped the old
  // location-based ৳5,000/4,000/3,000 split.
  minTax: { regular: 5000, newTaxpayer: 1000 },
  rebate: { rate: 0.1, incomeCapPct: 0.03, absoluteCap: 750000 },
  surcharge: SURCHARGE,
  filing: FILING,
};

// AY 2025–26 (income year 2024–25) — Paripatra 2025–26, Section 2.
// Note the extra 5% band and the lower thresholds vs AY 2026–27.
const AY2025 = {
  ayStart: 2025,
  thresholds: {
    general: 350000,
    womenSenior: 400000,
    disabledThirdGender: 475000,
    freedomFighter: 500000,
  },
  disabledChildBonus: 50000,
  employmentExemption: { fraction: 1 / 3, cap: 450000 },
  slabs: [
    { width: 100000, rate: 0.05 },
    { width: 400000, rate: 0.1 },
    { width: 500000, rate: 0.15 },
    { width: 500000, rate: 0.2 },
    { width: 2000000, rate: 0.25 },
    { width: Infinity, rate: 0.3 },
  ],
  // Location-based ৳5,000/4,000/3,000 (we model the ৳5,000 city-corp figure);
  // no new-taxpayer reduction this year.
  minTax: { regular: 5000, newTaxpayer: 5000 },
  rebate: { rate: 0.1, incomeCapPct: 0.03, absoluteCap: 750000 },
  surcharge: SURCHARGE,
  filing: FILING,
};

export const RULES_BY_YEAR = { 2025: AY2025, 2026: AY2026 };

// Default rate set (latest). compute() uses this when no `rules` is passed.
export const RULES = AY2026;
export const LATEST_RATES_YEAR = 2026;

// Assessment years offered in the UI, newest first.
export const ASSESSMENT_YEARS = [
  { ayStart: 2026, label: "AY 2026–27" },
  { ayStart: 2025, label: "AY 2025–26" },
];

export function rulesForYear(ayStart) {
  return RULES_BY_YEAR[ayStart] ?? RULES;
}

/**
 * Bangladesh's income year runs 1 July – 30 June; the assessment year follows it.
 * This rolls over on 1 July. Pass a date to override (defaults to today).
 *
 * e.g. 24 Jun 2026 → earned Jul 2025–Jun 2026, AY 2026–27
 *      01 Jul 2026 → earned Jul 2026–Jun 2027, AY 2027–28
 */
export function taxYearFor(date = new Date()) {
  const y = date.getFullYear();
  const julyOrLater = date.getMonth() >= 6; // month index 6 = July
  const incomeStart = julyOrLater ? y : y - 1;
  const incomeEnd = incomeStart + 1;
  const ayStart = incomeEnd;
  const ayEnd = ayStart + 1;
  const yy = (n) => String(n).slice(-2);
  return {
    incomeStart,
    incomeEnd,
    ayStart,
    ayEnd,
    earnedRange: `Jul ${incomeStart} – Jun ${incomeEnd}`,
    incomeYearLabel: `${incomeStart}–${yy(incomeEnd)}`,
    ayLabel: `AY ${ayStart}–${yy(ayEnd)}`,
  };
}
