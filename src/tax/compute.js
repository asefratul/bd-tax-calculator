import { RULES } from "./rules.js";

/**
 * Build the full slab ladder for a given threshold, including bands the income
 * does not reach (those get amount/tax = 0). Pure — for display and testing.
 *
 * @param {number} threshold     Tax-free threshold in effect (category + bonuses).
 * @param {number} taxableIncome Resolved taxable income.
 * @returns {Array<{start:number,end:number,width:number,rate:number,amount:number,tax:number}>}
 */
export function buildSlabBands(threshold, taxableIncome = 0, slabs = RULES.slabs) {
  const bands = [];
  let start = threshold;
  for (const { width, rate } of slabs) {
    const end = width === Infinity ? Infinity : start + width;
    const amount = Math.max(Math.min(taxableIncome, end) - start, 0);
    bands.push({ start, end, width, rate, amount, tax: amount * rate });
    if (end === Infinity) break;
    start = end;
  }
  return bands;
}

/**
 * Compute Bangladesh individual income tax for AY 2026–27.
 * Pure function — no UI concerns — so it is easy to unit test.
 *
 * @param {Object} input
 * @param {string} input.incomeMode     "gross" | "taxable" (default "taxable").
 * @param {number} input.grossSalary    Annual gross employment income (used when incomeMode="gross").
 * @param {number} input.taxableIncome  Annual income after allowable exemptions (used when incomeMode="taxable").
 * @param {number} input.otherIncome    Net taxable non-salary income (rent, interest, dividends, etc.);
 *                                       added to the taxable base and taxed at the same slab rates.
 * @param {string} input.category       Key into rules.thresholds (default "general").
 * @param {boolean} input.disabledChild Parent/guardian of a child with disability (+threshold bonus).
 * @param {boolean} input.newTaxpayer   First-time taxpayer (lower minimum-tax floor).
 * @param {number} input.investment     Eligible investment amount (drives the rebate).
 * @param {number} input.netWealth      Net wealth (drives the surcharge).
 * @param {number} input.ait            Refundable advance tax / salary TDS — fully creditable & refundable.
 * @param {number} input.otherAit       Non-refundable advance tax (e.g. private-car AIT, §153): offsets
 *                                       the liability to zero but any excess is forfeited, not refunded.
 * @param {string} input.filingQuarter  Key into rules.filing (default "q2").
 */
export function compute({
  incomeMode = "taxable",
  grossSalary = 0,
  taxableIncome = 0,
  otherIncome = 0,
  category = "general",
  disabledChild = false,
  newTaxpayer = false,
  investment = 0,
  netWealth = 0,
  ait = 0,
  otherAit = 0,
  filingQuarter = "q2",
  rules = RULES,
} = {}) {
  // In "gross" mode, derive the salary taxable amount by applying the salaried
  // employment exemption (lower of a fixed fraction of gross salary and the cap).
  // In "taxable" mode, the entered figure is taken as already net of exemptions.
  const { fraction, cap } = rules.employmentExemption;
  const exemption =
    incomeMode === "gross" ? Math.min((grossSalary || 0) * fraction, cap) : 0;
  const baseTaxable =
    incomeMode === "gross" ? Math.max((grossSalary || 0) - exemption, 0) : taxableIncome || 0;

  // Non-salary income (rent, interest, dividends, …) is aggregated into total
  // income and taxed at the same slab rates. Enter the net taxable amount.
  const otherInc = otherIncome || 0;
  taxableIncome = baseTaxable + otherInc;

  const base = rules.thresholds[category] ?? rules.thresholds.general;
  const threshold = base + (disabledChild ? rules.disabledChildBonus : 0);

  // Progressive slabs above the threshold
  let remaining = Math.max(taxableIncome - threshold, 0);
  const breakdown = [];
  let grossTax = 0;
  for (let i = 0; i < rules.slabs.length && remaining > 0; i++) {
    const { width, rate } = rules.slabs[i];
    const amount = Math.min(remaining, width);
    const tax = amount * rate;
    breakdown.push({ rate, amount, tax });
    grossTax += tax;
    remaining -= amount;
  }

  // Investment rebate (Section 78): lowest of 3% of taxable income,
  // 10% of actual investment, and the ৳7.5 lakh ceiling — then capped at gross tax.
  const rebateByIncome = rules.rebate.incomeCapPct * taxableIncome;
  const rebateByInvestment = rules.rebate.rate * (investment || 0);
  const rebateUncapped = Math.min(rebateByIncome, rebateByInvestment, rules.rebate.absoluteCap);
  const rebate = Math.min(rebateUncapped, grossTax);
  const afterRebate = grossTax - rebate;

  // Minimum tax floor (only if income exceeds the threshold)
  const exceeds = taxableIncome > threshold;
  const floor = newTaxpayer ? rules.minTax.newTaxpayer : rules.minTax.regular;
  const minApplied = exceeds && afterRebate < floor;
  const afterFloor = exceeds ? Math.max(afterRebate, floor) : afterRebate;

  // Net-wealth surcharge on the income tax payable
  let surchargeRate = 0;
  for (const tier of rules.surcharge) {
    if ((netWealth || 0) <= tier.upTo) {
      surchargeRate = tier.rate;
      break;
    }
  }
  const surcharge = afterFloor * surchargeRate;

  const total = afterFloor + surcharge;

  // Filing-time adjustment (early-filing rebate / late-filing surcharge)
  const fq = rules.filing[filingQuarter] || rules.filing.q2;
  let filingAdj = 0;
  if (fq.mode === "lower") filingAdj = fq.sign * Math.min(fq.pct * total, fq.bound);
  else if (fq.mode === "higher") filingAdj = fq.sign * Math.max(fq.pct * total, fq.bound);

  // The minimum-tax floor is a hard floor: an early-filing rebate must not pull
  // the tax below it once income exceeds the threshold. Trim the rebate to land
  // exactly on the floor so the receipt stays internally consistent.
  if (exceeds && total + filingAdj < floor) filingAdj = floor - total;

  const totalDue = total + filingAdj;

  // Credits. Non-refundable advance tax (e.g. private-car AIT, §153) is applied
  // first: it can wipe out the liability but any excess is forfeited, not paid
  // back. Refundable AIT (salary TDS) is applied next and may yield a refund.
  const refundableAit = ait || 0;
  const nonRefundableAit = otherAit || 0;
  const paid = refundableAit + nonRefundableAit;
  const afterNonRefundable = Math.max(totalDue - nonRefundableAit, 0);
  const forfeited = Math.max(nonRefundableAit - totalDue, 0); // excess non-refundable lost
  const net = afterNonRefundable - refundableAit; // positive = still owe; negative = refund

  return {
    incomeMode,
    baseTaxable,
    otherIncome: otherInc,
    refundableAit,
    nonRefundableAit,
    forfeited,
    exemption,
    taxableIncome,
    threshold,
    taxFreePortion: Math.min(taxableIncome, threshold),
    breakdown,
    grossTax,
    rebateByIncome,
    rebateByInvestment,
    rebateUncapped,
    rebate,
    afterRebate,
    floor,
    minApplied,
    exceeds,
    afterFloor,
    surchargeRate,
    surcharge,
    total,
    filingAdj,
    totalDue,
    paid,
    net,
    refund: net < 0,
    effective: taxableIncome > 0 ? totalDue / taxableIncome : 0,
  };
}
