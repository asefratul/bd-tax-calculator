# TaxLagbe — Bangladesh Income Tax Calculator

**Bangladesh income tax, calculated in seconds.**

An individual income tax calculator for Bangladesh, built on the **FY2026–27 budget**
(Assessment Year 2026–27 / Income Year 2025–26). React + Vite + Tailwind, with the tax
rules isolated in a single config module and a Vitest suite over the calculation engine.

> ⚠️ The figures encoded here are **proposed** until the Finance Act 2026 is gazetted.
> Verify rates, the rebate ceiling, and exemption rules against the final act and NBR
> circulars before relying on them. This is not tax advice.

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm test           # run the calculation test suite
npm run build      # production build to dist/
```

## Project structure

```
src/
  tax/
    rules.js          # ← ALL statutory numbers live here (edit this when the act changes)
    compute.js        # pure tax engine: compute(input) → full breakdown
    compute.test.js   # Vitest cases: slabs, rebate, min tax, filing quarters, AIT, surcharge
    format.js         # ৳ formatter (lakh/crore grouping)
    theme.js          # brand palette + slab colors
  components/
    BDTaxCalculator.jsx  # the screen (inputs + live statement)
    MoneyField.jsx       # currency input
    Toggle.jsx           # switch
    ReceiptRow.jsx       # itemized line
  App.jsx
  main.jsx
```

## How the tax is calculated

0. **Income basis** — an *Income basis* toggle lets you enter either **Taxable income**
   (already net of exemptions, the default) or **Gross salary**. In gross mode the
   calculator first applies the **salaried employment exemption** — the *lower* of
   one-third of gross salary and the ৳5,00,000 cap (`RULES.employmentExemption`) — and
   taxes the remainder. The exemption and the resolved taxable income are shown in the
   statement. This exemption applies to **employment income only**; if your income is
   from other sources, use the Taxable income basis.
0b. **Other income** — non-salary income (house-property rent, interest, dividends, etc.)
   is aggregated into total income and taxed at the same slab rates. Enter the *net
   taxable* amount (rent after the repair allowance, exempt interest excluded). The
   employment exemption does **not** apply to it.
1. **Slabs** — income above the category threshold is taxed at 10 / 15 / 20 / 25 / 30%.
2. **Investment rebate (Section 78)** — the *lowest* of: 3% of taxable income,
   10% of actual investment, and the ৳7.5 lakh ceiling; then capped at gross tax.
3. **Minimum tax** — if income exceeds the threshold, tax is floored at ৳5,000
   (৳1,000 for new taxpayers).
4. **Net-wealth surcharge** — a percentage of the tax, by wealth band (starts above ৳4 crore).
5. **Filing-quarter adjustment** — early filing (Jul–Sep) earns a rebate; late filing
   (Jan–Jun) adds to the tax.
6. **AIT** — advance tax already deducted is credited, yielding a net payable or refund.
   Salary TDS (*Tax already paid*) is fully refundable. **Other AIT** (e.g. private-car
   advance tax under §153) is credited too, but is *non-refundable*: it can offset the
   liability to zero and any excess is forfeited, not paid back.

## Maintaining the rules

Everything statutory is in `src/tax/rules.js`. The calculation logic in `compute.js`
reads from it and should rarely need to change. When the Finance Act is finalised,
update the constants there and adjust the tests in `compute.test.js` to match.

### The year label is dynamic; the rates are not

The header shows the income year and assessment year via `taxYearFor()`, which rolls
over automatically on **1 July** (the start of Bangladesh's income year). This is
presentation only — the tax numbers do **not** advance by themselves. Each year you must:

1. Update the constants in `RULES` for the new Finance Act, and
2. Bump `RULES.ratesAssessmentYearStart` to the new assessment year.

In development, if the displayed assessment year moves past `ratesAssessmentYearStart`
(i.e. it's a new tax year but the rates haven't been updated), the app logs a
`console.warn` so the drift doesn't ship silently.

### Known items to confirm against the final act

- The investment-rebate basis ("3% of taxable income") should exclude exempt income,
  income taxed at reduced rates, and partnership profit-share — this build applies 3%
  to the single taxable-income figure entered.
- The filing-quarter adjustment is applied *after* the net-wealth surcharge; confirm
  whether "tax payable" in the act means before or after surcharge.

## Roadmap

Planned and deferred work lives in [ROADMAP.md](ROADMAP.md).
