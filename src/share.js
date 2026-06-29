// Encode/decode the calculator inputs in the URL query string so a result can
// be shared or bookmarked. Short keys keep the link tidy.
const KEYS = {
  incomeMode: "m",
  income: "inc",
  otherIncome: "oi",
  category: "cat",
  disabledChild: "dc",
  newTaxpayer: "nt",
  investment: "inv",
  ait: "ait",
  otherAit: "oait",
  filingQuarter: "fq",
  netWealth: "nw",
};

const NUMERIC = new Set(["netWealth"]);
const BOOLEAN = new Set(["disabledChild", "newTaxpayer"]);

/** Parse inputs from a query string; only returns keys actually present. */
export function readShareParams(search = window.location.search) {
  const p = new URLSearchParams(search);
  const out = {};
  for (const [key, short] of Object.entries(KEYS)) {
    const raw = p.get(short);
    if (raw == null) continue;
    if (BOOLEAN.has(key)) out[key] = raw === "1";
    else if (NUMERIC.has(key)) out[key] = Number(raw);
    else out[key] = raw; // income/investment/... kept as strings (MoneyField-friendly)
  }
  return out;
}

/** Build a shareable absolute URL for the given input state. */
export function buildShareUrl(state) {
  // Start from the current query so unrelated params (e.g. utm_*) survive; only
  // our own keys are rewritten.
  const p = new URLSearchParams(window.location.search);
  for (const short of Object.values(KEYS)) p.delete(short);
  for (const [key, short] of Object.entries(KEYS)) {
    const v = state[key];
    if (BOOLEAN.has(key)) {
      if (v) p.set(short, "1"); // omit false to keep the link short
      continue;
    }
    if (v === "" || v == null) continue;
    p.set(short, String(v));
  }
  const { origin, pathname, hash } = window.location;
  const qs = p.toString();
  return qs ? `${origin}${pathname}?${qs}${hash}` : `${origin}${pathname}${hash}`;
}
