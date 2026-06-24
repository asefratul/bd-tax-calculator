// Format a number as Bangladeshi Taka with lakh/crore grouping (e.g. ৳12,00,000).
export const taka = (n) =>
  "৳" +
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n || 0));
