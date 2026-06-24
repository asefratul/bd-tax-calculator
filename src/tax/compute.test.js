import { describe, it, expect } from "vitest";
import { compute } from "./compute.js";
import { taxYearFor } from "./rules.js";

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
