"use client";

import { TRAVELER_TYPES, OCCASIONS } from "../lib/constants";

export default function TravelerDetails({
  travelerTypes,
  otherTraveler,
  occasion,
  onChange,
}: {
  travelerTypes: string[];
  otherTraveler: string;
  occasion: string;
  onChange: (field: string, value: unknown) => void;
}) {
  const toggleType = (type: string) => {
    const next = travelerTypes.includes(type)
      ? travelerTypes.filter((t) => t !== type)
      : [...travelerTypes, type];
    onChange("travelerTypes", next);
  };

  return (
    <div className="space-y-4">
      {/* Traveler Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Traveler Type
          <span className="text-gray-400 font-normal text-xs ml-1">(select all that apply)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TRAVELER_TYPES.map((type) => {
            const active = travelerTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        {travelerTypes.includes("Other") && (
          <input
            type="text"
            value={otherTraveler}
            onChange={(e) => onChange("otherTraveler", e.target.value)}
            placeholder="Describe your traveler type…"
            className="mt-2 w-full sm:w-72 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}
      </div>

      {/* Occasion */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Occasion
          <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
        </label>
        <select
          value={occasion}
          onChange={(e) => onChange("occasion", e.target.value)}
          className="w-full sm:w-64 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="">Select occasion (optional)</option>
          {OCCASIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
