import { describe, it, expect } from "vitest";
import { compute, buildSlabBands } from "./compute.js";
import { taxYearFor } from "./rules.js";

describe("buildSlabBands", () => {
  it("returns all five bands with absolute ranges from the threshold", () => {
    const bands = buildSlabBands(375000, 0);
    expect(bands).toHaveLength(5);
    expect(bands[0]).toMatchObject({ start: 375000, end: 675000, rate: 0.1 });
    expect(bands[1]).toMatchObject({ start: 675000, end: 1075000, rate: 0.15 });
    expect(bands[4].end).toBe(Infinity);
    expect(bands.every((b) => b.amount === 0 && b.tax === 0)).toBe(true);
  });

  it("fills only the bands the income reaches, matching compute's gross tax", () => {
    const bands = buildSlabBands(375000, 700000); // 325k above threshold
    expect(bands[0]).toMatchObject({ amount: 300000, tax: 30000 }); // full first band
    expect(bands[1]).toMatchObject({ amount: 25000, tax: 3750 }); // partial second
    expect(bands[2].amount).toBe(0); // not reached
    const sum = bands.reduce((t, b) => t + b.tax, 0);
    expect(sum).toBe(compute({ taxableIncome: 700000 }).grossTax);
  });
});

describe("slabs & threshold", () => {
  it("charges nothing within the tax-free threshold", () => {
    const r = compute({ taxableIncome: 375000 });
    expect(r.grossTax).toBe(0);
    expect(r.total).toBe(0); // min tax does NOT apply at/under threshold
  });

  it("computes progressive slab tax (700k general → 33,750)", () => {
    const r = compute({ taxableIncome: 700000 });
    // 300k @10% = 30,000 ; 25k @15% = 3,750
    expect(r.grossTax).toBe(33750);
    expect(r.breakdown).toHaveLength(2);
  });

  it("applies the higher threshold for women / seniors", () => {
    expect(compute({ taxableIncome: 425000, category: "womenSenior" }).grossTax).toBe(0);
  });

  it("adds the disabled-child bonus to the threshold", () => {
    const r = compute({ taxableIncome: 425000, category: "general", disabledChild: true });
    expect(r.threshold).toBe(425000); // 375,000 + 50,000
    expect(r.grossTax).toBe(0);
  });
});

describe("gross-salary mode (employment exemption)", () => {
  it("exemption is fraction-bound when 1/3 of salary is below the cap", () => {
    const r = compute({ incomeMode: "gross", grossSalary: 900000 });
    expect(r.exemption).toBe(300000); // 1/3 of 900,000 < 500,000 cap
    expect(r.taxableIncome).toBe(600000);
  });

  it("exemption is capped when 1/3 of salary exceeds the cap", () => {
    const r = compute({ incomeMode: "gross", grossSalary: 1800000 });
    expect(r.exemption).toBe(500000); // 1/3 = 600,000, capped at 500,000
    expect(r.taxableIncome).toBe(1300000);
  });

  it("derives taxable income and tax end to end from gross salary", () => {
    const r = compute({ incomeMode: "gross", grossSalary: 900000 });
    // taxable 600,000 → 225,000 above the 375,000 threshold @10% = 22,500
    expect(r.taxableIncome).toBe(600000);
    expect(r.grossTax).toBe(22500);
  });

  it("leaves taxable mode unchanged (no exemption applied)", () => {
    const r = compute({ taxableIncome: 700000 });
    expect(r.incomeMode).toBe("taxable");
    expect(r.exemption).toBe(0);
    expect(r.taxableIncome).toBe(700000);
    expect(r.grossTax).toBe(33750); // identical to the slab test
  });
});

describe("investment rebate (lowest of three)", () => {
  it("is bound by 3% of income when investment is large", () => {
    const r = compute({ taxableIncome: 1200000, investment: 500000 });
    expect(r.rebate).toBe(36000); // 3% of 1,200,000
  });

  it("is bound by 10% of investment when investment is small", () => {
    const r = compute({ taxableIncome: 2000000, investment: 100000 });
    expect(r.rebate).toBe(10000); // 10% of 100,000 < 3% of 2,000,000 (60,000)
  });

  it("never exceeds gross tax", () => {
    const r = compute({ taxableIncome: 400000, investment: 1000000 });
    expect(r.rebate).toBeLessThanOrEqual(r.grossTax);
  });
});

describe("minimum tax floor", () => {
  it("applies the ৳5,000 floor once income exceeds the threshold", () => {
    const r = compute({ taxableIncome: 380000 }); // 5,000 @10% = 500 gross
    expect(r.minApplied).toBe(true);
    expect(r.total).toBe(5000);
  });

  it("uses the ৳1,000 floor for new taxpayers", () => {
    const r = compute({ taxableIncome: 380000, newTaxpayer: true });
    expect(r.total).toBe(1000);
  });

  it("does not let the early-filing rebate pull tax below the floor", () => {
    // 380k → 500 gross, floored to 5,000. A Q1 5% rebate (−250) must not breach it.
    const r = compute({ taxableIncome: 380000, filingQuarter: "q1" });
    expect(r.total).toBe(5000);
    expect(r.totalDue).toBe(5000);
    expect(r.filingAdj).toBe(0);
  });
});

describe("filing-quarter adjustment", () => {
  const income = 1075000; // gross tax = 30,000 + 60,000 = 90,000 (no rebate)

  it("Q1 gives a 5% early-filing rebate", () => {
    const r = compute({ taxableIncome: income, filingQuarter: "q1" });
    expect(r.filingAdj).toBe(-4500); // 5% of 90,000
    expect(r.totalDue).toBe(85500);
  });

  it("Q1 rebate is capped at ৳25,000", () => {
    const r = compute({ taxableIncome: 5000000, filingQuarter: "q1" });
    expect(r.filingAdj).toBe(-25000);
  });

  it("Q2 is neutral", () => {
    expect(compute({ taxableIncome: income, filingQuarter: "q2" }).filingAdj).toBe(0);
  });

  it("Q3 adds the higher of 2% or ৳3,000", () => {
    const r = compute({ taxableIncome: income, filingQuarter: "q3" });
    expect(r.filingAdj).toBe(3000); // 2% of 90,000 = 1,800 < 3,000
  });

  it("Q4 adds the higher of 5% or ৳5,000", () => {
    const r = compute({ taxableIncome: income, filingQuarter: "q4" });
    expect(r.filingAdj).toBe(5000); // 5% of 90,000 = 4,500 < 5,000
  });
});

describe("other (non-salary) income", () => {
  it("adds other income to the taxable base and taxes it at slab rates", () => {
    const r = compute({ taxableIncome: 700000, otherIncome: 200000 });
    expect(r.baseTaxable).toBe(700000);
    expect(r.otherIncome).toBe(200000);
    expect(r.taxableIncome).toBe(900000);
    // 900k → 525k above threshold: 300k@10% + 225k@15% = 63,750
    expect(r.grossTax).toBe(63750);
  });

  it("adds other income on top of the post-exemption salary in gross mode", () => {
    const r = compute({ incomeMode: "gross", grossSalary: 900000, otherIncome: 100000 });
    expect(r.baseTaxable).toBe(600000); // 900k − 300k exemption
    expect(r.taxableIncome).toBe(700000); // + 100k other
    expect(r.grossTax).toBe(33750);
  });
});

describe("non-refundable other AIT (e.g. car AIT)", () => {
  it("offsets the liability but is not refunded when it exceeds it", () => {
    const r = compute({ taxableIncome: 700000, otherAit: 40000 }); // due 33,750
    expect(r.refund).toBe(false);
    expect(r.net).toBe(0); // wiped to zero, not negative
    expect(r.forfeited).toBe(6250); // 40,000 − 33,750 lost
  });

  it("combines with refundable salary AIT, which can still produce a refund", () => {
    const r = compute({ taxableIncome: 700000, ait: 10000, otherAit: 30000 });
    // 33,750 − 30,000 (non-refundable) = 3,750 remaining; − 10,000 salary AIT = −6,250
    expect(r.refund).toBe(true);
    expect(r.net).toBe(-6250);
    expect(r.forfeited).toBe(0);
  });
});

describe("AIT crediting", () => {
  it("produces a refund when AIT exceeds the liability", () => {
    const r = compute({ taxableIncome: 700000, ait: 40000 }); // due 33,750
    expect(r.refund).toBe(true);
    expect(Math.round(Math.abs(r.net))).toBe(6250);
  });

  it("leaves a net payable when AIT is short", () => {
    const r = compute({ taxableIncome: 700000, ait: 10000 });
    expect(r.refund).toBe(false);
    expect(r.net).toBe(23750);
  });
});

describe("net-wealth surcharge", () => {
  it("is zero up to ৳4 crore", () => {
    expect(compute({ taxableIncome: 700000, netWealth: 40000000 }).surchargeRate).toBe(0);
  });

  it("is 10% between ৳4 and ৳10 crore", () => {
    const r = compute({ taxableIncome: 700000, netWealth: 50000000 });
    expect(r.surchargeRate).toBe(0.1);
    expect(r.surcharge).toBeCloseTo(r.afterFloor * 0.1, 5);
  });

  // Paripatra 2025–26 (AY 2026–27) tiers: 0 / 10 / 20 / 30 / 35%.
  it("follows the Paripatra surcharge tiers", () => {
    expect(compute({ taxableIncome: 700000, netWealth: 150000000 }).surchargeRate).toBe(0.2); // ৳10–20cr
    expect(compute({ taxableIncome: 700000, netWealth: 300000000 }).surchargeRate).toBe(0.3); // ৳20–50cr
    expect(compute({ taxableIncome: 700000, netWealth: 600000000 }).surchargeRate).toBe(0.35); // >৳50cr
  });
});

describe("taxYearFor (1 July rollover)", () => {
  it("before July maps to the income year that began last July", () => {
    const ty = taxYearFor(new Date("2026-06-24"));
    expect(ty.earnedRange).toBe("Jul 2025 – Jun 2026");
    expect(ty.ayLabel).toBe("AY 2026–27");
  });

  it("rolls over on 1 July to the next income year", () => {
    const ty = taxYearFor(new Date("2026-07-01"));
    expect(ty.earnedRange).toBe("Jul 2026 – Jun 2027");
    expect(ty.ayLabel).toBe("AY 2027–28");
  });

  it("stays put through the following June", () => {
    const ty = taxYearFor(new Date("2027-06-30"));
    expect(ty.ayLabel).toBe("AY 2027–28");
  });
});
