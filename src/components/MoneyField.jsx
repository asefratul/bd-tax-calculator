import { C } from "../tax/theme.js";

export default function MoneyField({ label, hint, value, onChange }) {
  return (
    <label className="block">
      <span style={{ color: C.muted }} className="text-xs uppercase tracking-wide">
        {label}
      </span>
      <div
        className="mt-0.5 flex items-center rounded-md px-3"
        style={{ border: `1px solid ${C.line}`, background: "#fbfcfb" }}
      >
        <span style={{ color: C.muted }} className="mr-1 text-sm">
          ৳
        </span>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={value}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
          }
          className="w-full bg-transparent py-1.5 text-right outline-none font-mono"
          style={{ color: C.ink, fontSize: "1rem" }}
        />
      </div>
      {hint && (
        <span style={{ color: C.muted }} className="mt-0.5 block text-xs leading-snug">
          {hint}
        </span>
      )}
    </label>
  );
}
