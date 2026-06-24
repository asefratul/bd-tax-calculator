import { track } from "@vercel/analytics";

/**
 * Coarse income bucket. We deliberately never send the visitor's actual income
 * or tax figures to analytics — only a wide band — to keep financial data private.
 */
export function incomeBand(amount) {
  const n = Number(amount) || 0;
  if (n <= 0) return "none";
  if (n < 400000) return "<4L";
  if (n < 700000) return "4-7L";
  if (n < 1200000) return "7-12L";
  if (n < 3000000) return "12-30L";
  return "30L+";
}

/**
 * Fire a Vercel Web Analytics custom event. Wrapped so a failed/blocked analytics
 * call can never break the calculator. Custom events require a Vercel Pro plan.
 */
export function trackEvent(name, props) {
  try {
    track(name, props);
  } catch {
    /* analytics is best-effort; never throw into the UI */
  }
}
