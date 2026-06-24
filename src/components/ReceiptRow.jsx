import { C } from "../tax/theme.js";
import { taka } from "../tax/format.js";

export default function ReceiptRow({ label, value, color, strong, neg }) {
  return (
    <div
      className="flex items-baseline justify-between py-1.5"
      style={{ borderBottom: `1px dashed ${C.line}` }}
    >
      <span
        style={{ color: color || C.ink, fontWeight: strong ? 600 : 400 }}
        className="text-sm"
      >
        {label}
      </span>
      <span
        style={{ color: color || C.ink, fontWeight: strong ? 600 : 400 }}
        className="text-sm font-mono"
      >
        {neg ? "−" : ""}
        {taka(value)}
      </span>
    </div>
  );
}
