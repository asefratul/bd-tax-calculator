/* ============================================================
   TAX RULES — Assessment Year 2026–27 (Income Year 2025–26)
   Based on the FY2026–27 budget / NBR Income Tax Paripatra 2025–26.

   These figures are PROPOSED until the Finance Act is gazetted.
   This file is the single source of truth — edit the constants here,
   not the logic in compute.js.
   ============================================================ */
export const RULES = {
  // The assessment year these rates encode (AY start year). Used to warn when
  // the date-driven label outruns the encoded rates.
  ratesAssessmentYearStart: 2026,

  // Tax-free threshold by taxpayer category (৳)
  thresholds: {
    general: 400000, // proposed: raised from ৳3,75,000 (Paripatra 2025–26)
    womenSenior: 425000, // women, and anyone aged 65+
    disabledThirdGender: 500000, // persons with disability / third gender
    freedomFighter: 525000, // gazetted war-wounded FF & "July Warriors 2024"
  },
  disabledChildBonus: 50000, // added to threshold; one parent/guardian only

  // Salaried employment-income exemption: the LOWER of (fraction × employment
  // income) and the cap. Finance Ordinance 2025 raised the cap to ৳5,00,000.
  employmentExemption: { fraction: 1 / 3, cap: 500000 },

  // Progressive slabs applied to income ABOVE the threshold
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

  // Investment rebate (Section 78). Rebate = LOWEST of:
  //   incomeCapPct × taxable income, rate × actual investment, absoluteCap.
  rebate: { rate: 0.1, incomeCapPct: 0.03, absoluteCap: 750000 },

  // Net-wealth surcharge tiers (Paripatra 2025–26): 0 / 10 / 20 / 30 / 35%.
  surcharge: [
    { upTo: 40000000, rate: 0 }, // up to ৳4 crore
    { upTo: 100000000, rate: 0.1 }, // ৳4–10 crore
    { upTo: 200000000, rate: 0.2 }, // ৳10–20 crore
    { upTo: 500000000, rate: 0.3 }, // ৳20–50 crore
    { upTo: Infinity, rate: 0.35 }, // above ৳50 crore
  ],

  // Filing-time adjustment by quarter. ILLUSTRATIVE — NOT a statutory NBR
  // provision (the UI flags it). Real late filing incurs §174 simple interest.
  // "lower"/"higher" picks between pct×tax and the fixed bound.
  filing: {
    q1: { sign: -1, pct: 0.05, bound: 25000, mode: "lower" }, // Jul–Sep
    q2: { sign: 0, pct: 0, bound: 0, mode: "none" }, // Oct–Dec
    q3: { sign: 1, pct: 0.02, bound: 3000, mode: "higher" }, // Jan–Mar
    q4: { sign: 1, pct: 0.05, bound: 5000, mode: "higher" }, // Apr–Jun
  },
};

export const FILING_QUARTERS = [
  { key: "q1", label: "Jul–Sep" },
  { key: "q2", label: "Oct–Dec" },
  { key: "q3", label: "Jan–Mar" },
  { key: "q4", label: "Apr–Jun" },
];

export const CATEGORIES = [
  { key: "general", label: "General" },
  { key: "womenSenior", label: "Woman / 65+" },
  { key: "disabledThirdGender", label: "Disability / third gender" },
  { key: "freedomFighter", label: "Freedom fighter" },
];

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
