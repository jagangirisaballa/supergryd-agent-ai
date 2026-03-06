"use client";

import { BUDGET_TIERS } from "../lib/constants";

export default function BudgetSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Budget <span className="text-red-400">*</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BUDGET_TIERS.map((tier) => {
          const selected = value === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onChange(tier.id)}
              className={`text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                selected
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-blue-300"
              }`}
            >
              <span className={`block text-sm font-semibold ${selected ? "text-blue-700" : "text-gray-800"}`}>
                {tier.label}
              </span>
              <span className="block text-xs text-gray-500 mt-0.5 leading-snug">
                {tier.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
