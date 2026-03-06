"use client";

const STEPPERS = [
  { field: "adults", label: "Adults", min: 1 },
  { field: "children", label: "Children", min: 0 },
  { field: "infants", label: "Infants", min: 0 },
];

export default function PaxSelector({
  adults,
  children,
  infants,
  onChange,
}: {
  adults: number;
  children: number;
  infants: number;
  onChange: (field: string, value: number) => void;
}) {
  const values: Record<string, number> = { adults, children, infants };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Passengers</label>
      <div className="flex flex-wrap gap-4">
        {STEPPERS.map(({ field, label, min }) => (
          <div key={field} className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">{label}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange(field, Math.max(min, values[field] - 1))}
                disabled={values[field] <= min}
                className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center text-lg font-medium hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold text-gray-800">
                {values[field]}
              </span>
              <button
                type="button"
                onClick={() => onChange(field, values[field] + 1)}
                className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center text-lg font-medium hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
