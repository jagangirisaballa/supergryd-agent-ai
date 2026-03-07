"use client";

import { useState } from "react";

export type TravelDatesValue = {
  startDate: Date | null;
  endDate: Date | null;
  arrivalTime: string;
  departureTime: string;
  nights: number | null;
};

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? "AM" : "PM";
    const min = m === 0 ? "00" : "30";
    TIME_OPTIONS.push(`${hour}:${min} ${ampm}`);
  }
}

const NIGHT_OPTIONS = [2, 3, 4, 5, 6, 7, 8];

function toInputValue(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function fromInputValue(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function nightCount(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

const today = new Date().toISOString().slice(0, 10);

export default function TravelDates({
  value,
  onChange,
}: {
  value: TravelDatesValue;
  onChange: (v: TravelDatesValue) => void;
}) {
  const [mode, setMode] = useState<"exact" | "nights">("exact");

  const set = (patch: Partial<TravelDatesValue>) => onChange({ ...value, ...patch });

  const bothSelected = !!(value.startDate && value.endDate);
  const nights = bothSelected ? nightCount(value.startDate!, value.endDate!) : null;

  const showNote =
    mode === "nights" ||
    (mode === "exact" && (!value.arrivalTime || !value.departureTime));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Travel Dates <span className="text-red-400">*</span>
        </label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          <button
            type="button"
            onClick={() => { setMode("exact"); set({ nights: null }); }}
            className={`px-3 py-1 transition-colors ${
              mode === "exact" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:text-gray-700"
            }`}
          >
            Exact Dates
          </button>
          <button
            type="button"
            onClick={() => { setMode("nights"); set({ startDate: null, endDate: null, arrivalTime: "", departureTime: "" }); }}
            className={`px-3 py-1 transition-colors border-l border-gray-200 ${
              mode === "nights" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:text-gray-700"
            }`}
          >
            Nights
          </button>
        </div>
      </div>

      {mode === "exact" && (
        <div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                min={today}
                value={toInputValue(value.startDate)}
                onChange={(e) => {
                  const start = fromInputValue(e.target.value);
                  // Clear end if it's before new start
                  const end = value.endDate && start && value.endDate <= start ? null : value.endDate;
                  set({ startDate: start, endDate: end });
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>

            {nights !== null && (
              <div className="pb-2.5 text-xs font-semibold text-blue-600 whitespace-nowrap">
                {nights}N
              </div>
            )}

            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                min={value.startDate ? toInputValue(value.startDate) : today}
                value={toInputValue(value.endDate)}
                onChange={(e) => set({ endDate: fromInputValue(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>
          </div>

          {bothSelected && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Arrival Time</label>
                <select
                  value={value.arrivalTime}
                  onChange={(e) => set({ arrivalTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Not specified</option>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Departure Time</label>
                <select
                  value={value.departureTime}
                  onChange={(e) => set({ departureTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Not specified</option>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "nights" && (
        <div className="flex flex-wrap gap-2">
          {NIGHT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set({ nights: value.nights === n ? null : n })}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                value.nights === n
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {n}N
            </button>
          ))}
        </div>
      )}

      {showNote && (
        <p className="mt-2 text-xs text-gray-400 italic">
          Activities will be adjusted based on actual arrival and departure times
        </p>
      )}
    </div>
  );
}
