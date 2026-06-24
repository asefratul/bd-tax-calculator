import { RULES } from "./rules.js";

/**
 * Compute Bangladesh individual income tax for AY 2026–27.
 * Pure function — no UI concerns — so it is easy to unit test.
 *
 * @param {Object} input
 * @param {number} input.taxableIncome  Annual income after allowable exemptions.
 * @param {string} input.category       Key into RULES.thresholds (default "general").
 * @param {boolean} input.disabledChild Parent/guardian of a child with disability (+threshold bonus).
 * @param {boolean} input.newTaxpayer   First-time taxpayer (lower minimum-tax floor).
 * @param {number} input.investment     Eligible investment amount (drives the rebate).
 * @param {number} input.netWealth      Net wealth (drives the surcharge).
 * @param {number} input.ait            Advance income tax already paid (TDS).
 * @param {string} input.filingQuarter  Key into RULES.filing (default "q2").
 */
export function compute({
  taxableIncome = 0,
  category = "general",
  disabledChild = false,
  newTaxpayer = false,
  investment = 0,
  netWealth = 0,
  ait = 0,
  filingQuarter = "q2",
} = {}) {
  const base = RULES.thresholds[category] ?? RULES.thresholds.general;
  const threshold = base + (disabledChild ? RULES.disabledChildBonus : 0);

  // Progressive slabs above the threshold
  let remaining = Math.max(taxableIncome - threshold, 0);
  const breakdown = [];
  let grossTax = 0;
  for (let i = 0; i < RULES.slabs.length && remaining > 0; i++) {
    const { width, rate } = RULES.slabs[i];
    const amount = Math.min(remaining, width);
    const tax = amount * rate;
    breakdown.push({ rate, amount, tax });
    grossTax += tax;
    remaining -= amount;
  }

  // Investment rebate (Section 78): lowest of 3% of taxable income,
  // 10% of actual investment, and the ৳7.5 lakh ceiling — then capped at gross tax.
  const rebateByIncome = RULES.rebate.incomeCapPct * taxableIncome;
  const rebateByInvestment = RULES.rebate.rate * (investment || 0);
  const rebateUncapped = Math.min(rebateByIncome, rebateByInvestment, RULES.rebate.absoluteCap);
  const rebate = Math.min(rebateUncapped, grossTax);
  const afterRebate = grossTax - rebate;

  // Minimum tax floor (only if income exceeds the threshold)
  const exceeds = taxableIncome > threshold;
  const floor = newTaxpayer ? RULES.minTax.newTaxpayer : RULES.minTax.regular;
  const minApplied = exceeds && afterRebate < floor;
  const afterFloor = exceeds ? Math.max(afterRebate, floor) : afterRebate;

  // Net-wealth surcharge on the income tax payable
  let surchargeRate = 0;
  for (const tier of RULES.surcharge) {
    if ((netWealth || 0) <= tier.upTo) {
      surchargeRate = tier.rate;
      break;
    }
  }
  const surcharge = afterFloor * surchargeRate;

  const total = afterFloor + surcharge;

  // Filing-time adjustment (early-filing rebate / late-filing surcharge)
  const fq = RULES.filing[filingQuarter] || RULES.filing.q2;
  let filingAdj = 0;
  if (fq.mode === "lower") filingAdj = fq.sign * Math.min(fq.pct * total, fq.bound);
  else if (fq.mode === "higher") filingAdj = fq.sign * Math.max(fq.pct * total, fq.bound);
  const totalDue = total + filingAdj;

  const paid = ait || 0;
  const net = totalDue - paid; // positive = still owe; negative = refund

  return {
    threshold,
    taxFreePortion: Math.min(taxableIncome, threshold),
    breakdown,
    grossTax,
    rebateByIncome,
    rebateByInvestment,
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
