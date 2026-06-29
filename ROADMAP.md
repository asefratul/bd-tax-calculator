# Roadmap

Planned work for **TaxLagbe**. Status reflects decisions made for the next version
(v2). This is a living document — open an issue or PR to propose changes.

> The tax figures remain **proposed** until the Finance Act is gazetted. Correctness
> items that depend on unannounced NBR changes are parked under **Deferred** below.

## v2 — planned

Ordered roughly by suggested build order (small, trust-building wins first; the
full i18n pass last, so every string is translated once).

- [ ] **Fix the "Slab tax came to …" label.** It currently shows the *after-rebate*
  amount but labels it as slab tax — relabel it (or show gross slab tax).
- [ ] **Accessibility.** Add `aria-pressed` to the segmented buttons (income basis,
  category, filing quarter) and `role="switch"` / `aria-checked` to the toggles.
- [ ] **"How it's calculated" + NBR sources.** An in-app explainer of the steps,
  with links to the relevant NBR Paripatra / Finance Act sections, to build trust.
- [ ] **Shareable / printable result.** A "Copy link" that encodes the inputs in the
  URL, and/or a clean print/PDF view of the statement.
- [ ] **Bangla (বাংলা) i18n.** Full language toggle — labels, hints, and Taka
  formatting. Do this **last**: it extracts every UI string, so landing the items
  above first means translating them only once.

## Deferred

Parked deliberately — not scheduled yet.

- **Assessment-year selector + previous-year comparison.** Was built and then pulled:
  the prior-year (AY 2025–26) rate set needs more verification before it can ship —
  the surcharge tiers, investment rebate, and location-based minimum tax
  (৳5,000/4,000/3,000) for that year still need confirming against NBR sources.
  Revisit once the AY 2025–26 numbers are fully verified.
- **Investment rebate % and surcharge base.** The app uses a 10% rebate (৳7.5L cap)
  and includes minimum tax in the surcharge base. These may change (commonly cited:
  15% rebate; Paripatra says minimum tax is *not* a surcharge base from AY 2026–27),
  **but there is no concrete NBR announcement yet** — revisit when the Finance Act /
  NBR circular lands. Current values stay, consistent with the "proposed" disclaimer.
- **House-property income helper** (auto repair allowance / municipal tax / loan
  interest on rent) — needs more accurate rules before building.
- **Re-enable the net-wealth surcharge UI** (currently behind the `showSurchargeUI`
  flag) — tie to the surcharge-base fix above.
- **GitHub Actions CI** to run the Vitest suite on PRs.
- **Analytics-driven iteration** — use the Vercel custom events to prioritise future
  UX work once enough data has accrued.

## Done

- Tax engine: progressive slabs, investment rebate, minimum-tax floor (incl. the
  ৳1,000 new-taxpayer floor), filing-quarter adjustment, AIT crediting.
- Gross-salary vs taxable-income input modes (auto employment exemption).
- Other (non-salary) income and non-refundable "Other AIT" (§153).
- Per-category slab schedule / per-slab gross-tax breakdown.
- Aligned net-wealth surcharge tiers with the NBR Paripatra 2025–26 (incl. the
  ৳20–50 crore band at 30%).
- Flagged the filing-quarter adjustment as illustrative / not an NBR rule.
- SEO metadata, logo/favicon, 1200×630 social share banner.
- Vercel Web Analytics + privacy-safe custom events.
