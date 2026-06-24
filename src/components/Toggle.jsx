import { C } from "../tax/theme.js";

export default function Toggle({ label, sub, checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left"
      style={{
        border: `1px solid ${checked ? C.accent : C.line}`,
        background: checked ? "#f0f7f3" : "#fbfcfb",
      }}
    >
      <span>
        <span style={{ color: C.ink }} className="block text-sm">
          {label}
        </span>
        {sub && (
          <span style={{ color: C.muted }} className="block text-xs">
            {sub}
          </span>
        )}
      </span>
      <span
        className="relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? C.accent : "#cdd4cf" }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
          style={{ left: checked ? "1.125rem" : "0.125rem" }}
        />
      </span>
    </button>
  );
}
