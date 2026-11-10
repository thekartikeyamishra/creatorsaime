"use client";

import { cx } from "./ui";

export function ChipSelect({ legend, options, value, onChange, max }: { legend: string; options: readonly string[]; value: string[]; onChange: (v: string[]) => void; max: number }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">
        {legend} <span className="font-normal text-muted">(up to {max})</span>
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== o) : value.length < max ? [...value, o] : value)}
              className={cx("rounded-full px-3 py-1.5 text-sm ring-1 transition", on ? "bg-brand text-white ring-brand" : "bg-white ring-line hover:ring-slate-300")}
            >
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
