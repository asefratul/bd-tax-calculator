import { C } from "../tax/theme.js";
import { RULES } from "../tax/rules.js";
import { taka } from "../tax/format.js";

const Step = ({ n, title, children }) => (
  <li className="mb-2.5 flex gap-2">
    <span
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ background: "#f0f7f3", color: C.accent }}
    >
      {n}
    </span>
    <span style={{ color: C.ink }} className="text-sm leading-snug">
      <strong>{title}</strong> {children}
    </span>
  </li>
);

/**
 * Collapsible explainer of the calculation steps, with links to the NBR sources.
 * Uses a native <details> so it stays keyboard-accessible without extra JS.
 */
export default function HowItWorks({ rules = RULES }) {
  const { employmentExemption: ex, rebate, minTax } = rules;
  const pct = (x) => `${Math.round(x * 100)}%`;

  return (
    <details
      className="mt-6 rounded-xl p-4"
      style={{ background: C.card, border: `1px solid ${C.line}` }}
    >
      <summary
        className="cursor-pointer text-sm font-semibold"
        style={{ color: C.accent }}
      >
        How this is calculated
      </summary>

      <ol className="mt-3 list-none p-0">
        <Step n="1" title="Income basis.">
          In gross-salary mode the salaried employment exemption — the lower of one-third of
          salary and {taka(ex.cap)} — is removed first; the remainder is your taxable income.
          Non-salary income (rent, interest) is added on top.
        </Step>
        <Step n="2" title="Progressive slabs.">
          Income above your category's tax-free threshold is taxed in bands at 10 / 15 / 20 / 25 / 30%.
        </Step>
        <Step n="3" title="Investment rebate (Section 78).">
          The lowest of {pct(rebate.rate)} of your eligible investment, {pct(rebate.incomeCapPct)} of
          taxable income, and {taka(rebate.absoluteCap)} — then capped at the gross tax.
        </Step>
        <Step n="4" title="Minimum tax.">
          If income exceeds the threshold, the tax is floored at {taka(minTax.regular)} ({taka(minTax.newTaxpayer)} for
          new taxpayers).
        </Step>
        <Step n="5" title="Advance tax (AIT) credit.">
          Tax already paid is credited. Salary TDS is refundable if it exceeds the liability; other
          AIT (e.g. private-car tax, §153) can offset the tax to zero but is not refundable.
        </Step>
      </ol>

      <p style={{ color: C.muted }} className="mt-1 text-xs leading-relaxed">
        The net-wealth surcharge applies above ৳4 crore. The filing-quarter adjustment is
        illustrative and not an NBR rule. Figures follow the FY2026–27 budget and remain proposed
        until the Finance Act is gazetted — this is not tax advice.
      </p>

      <p style={{ color: C.muted }} className="mt-2 text-xs">
        Sources:{" "}
        <a
          href="https://nbr.gov.bd/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: C.accent }}
        >
          National Board of Revenue (NBR)
        </a>{" "}
        · NBR Income Tax Paripatra 2025–26 ·{" "}
        <a
          href="http://bdlaws.minlaw.gov.bd/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: C.accent }}
        >
          Income Tax Act 2023 (bdlaws)
        </a>
      </p>
    </details>
  );
}
