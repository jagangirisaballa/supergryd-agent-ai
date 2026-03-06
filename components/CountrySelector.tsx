"use client";

import { useState, useRef, useEffect } from "react";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

type Country = { code: string; name: string; emoji: string };

const TOP_CODES = ["SG", "TH", "VN", "ID", "GB", "US", "AE", "MY"];

function getFlagEmoji(code: string) {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

const ALL_COUNTRIES: Country[] = Object.entries(
  countries.getNames("en", { select: "official" })
).map(([code, name]) => ({
  code,
  name,
  emoji: getFlagEmoji(code),
}));

const TOP_DESTINATIONS = TOP_CODES.map(
  (code) => ALL_COUNTRIES.find((c) => c.code === code)!
).filter(Boolean);

const REST_OF_COUNTRIES = ALL_COUNTRIES.filter(
  (c) => !TOP_CODES.includes(c.code)
).sort((a, b) => a.name.localeCompare(b.name));

export default function CountrySelector({
  value = [],
  onChange,
  placeholder = "Search countries...",
  label = "Destination Countries",
}: {
  value?: Country[];
  onChange: (countries: Country[]) => void;
  placeholder?: string;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCodes = new Set(value.map((c) => c.code));

  const filteredTop = TOP_DESTINATIONS.filter(
    (c) => !selectedCodes.has(c.code) && c.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredRest = REST_OF_COUNTRIES.filter(
    (c) => !selectedCodes.has(c.code) && c.name.toLowerCase().includes(query.toLowerCase())
  );

  const hasResults = filteredTop.length > 0 || filteredRest.length > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectCountry = (country: Country) => {
    onChange([...value, country]);
    setQuery("");
    inputRef.current?.focus();
  };

  const removeCountry = (code: string) => {
    onChange(value.filter((c) => c.code !== code));
  };

  return (
    <div className="w-full relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div
        className={`min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 flex flex-wrap gap-2 items-center cursor-text transition-all duration-150 ${isOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-300 hover:border-gray-400"}`}
        onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
      >
        {value.map((country) => (
          <span key={country.code} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium rounded-full px-2.5 py-0.5">
            <span>{country.emoji}</span>
            <span>{country.name}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); removeCountry(country.code); }} className="ml-0.5 text-blue-400 hover:text-blue-700 transition-colors leading-none text-base">×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={value.length === 0 ? placeholder : "Add more..."}
          className="flex-1 min-w-[140px] outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent"
        />
      </div>

      {isOpen && (
        <div ref={dropdownRef} className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-y-auto" style={{ maxHeight: "320px" }}>
          {!hasResults && <div className="px-4 py-3 text-sm text-gray-400">No countries found for "{query}"</div>}
          {filteredTop.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wider bg-amber-50 border-b border-amber-100">⭐ Top Destinations</div>
              {filteredTop.map((country) => (
                <button key={country.code} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => selectCountry(country)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left">
                  <span className="text-lg leading-none">{country.emoji}</span>
                  <span>{country.name}</span>
                </button>
              ))}
            </>
          )}
          {filteredRest.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">All Countries</div>
              {filteredRest.map((country) => (
                <button key={country.code} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => selectCountry(country)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left">
                  <span className="text-lg leading-none">{country.emoji}</span>
                  <span>{country.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
      {value.length > 0 && (
        <p className="mt-1.5 text-xs text-gray-400">{value.length} {value.length === 1 ? "country" : "countries"} selected{value.length > 1 ? " — multi-country routing supported" : ""}</p>
      )}
    </div>
  );
}
