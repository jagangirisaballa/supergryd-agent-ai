"use client";

import { useState, useRef, useEffect, useMemo } from "react";

type Country = { code: string; name: string; emoji: string };
type City = { name: string; countryCode: string };

// Top cities per country code
const TOP_CITIES: Record<string, string[]> = {
  JP: ["Tokyo", "Osaka", "Kyoto"],
  GB: ["London", "Manchester"],
  US: ["New York", "Los Angeles", "Las Vegas"],
  AE: ["Dubai", "Abu Dhabi"],
  SG: ["Singapore"],
  TH: ["Bangkok", "Phuket", "Chiang Mai"],
  ID: ["Denpasar", "Jakarta"],
  MY: ["Kuala Lumpur", "George Town"],
  VN: ["Hanoi", "Ho Chi Minh City", "Da Nang"],
};

// Display overrides for top city names
const TOP_CITY_DISPLAY: Record<string, string> = {
  Denpasar: "Bali/Denpasar",
  "George Town": "Penang",
};

export default function CitySelector({
  selectedCountries = [],
  value = [],
  onChange,
}: {
  selectedCountries?: Country[];
  value?: City[];
  onChange: (cities: City[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [freeTextCountry, setFreeTextCountry] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const disabled = selectedCountries.length === 0;
  const selectedKeys = new Set(value.map((c) => `${c.countryCode}:${c.name}`));

  // Fetch cities from API whenever selectedCountries changes
  useEffect(() => {
    if (selectedCountries.length === 0) {
      setAvailableCities([]);
      return;
    }
    const codes = selectedCountries.map((c) => c.code).join(",");
    setLoading(true);
    fetch(`/api/cities?codes=${codes}`)
      .then((r) => r.json())
      .then((data: City[]) => setAvailableCities(data))
      .finally(() => setLoading(false));
  }, [selectedCountries]);

  // Build a lookup of city names by country from fetched data
  const citiesByCountry = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const city of availableCities) {
      if (!map[city.countryCode]) map[city.countryCode] = [];
      map[city.countryCode].push(city.name);
    }
    return map;
  }, [availableCities]);

  // Group selected chips by country
  const chipsByCountry = useMemo(() => {
    const map: Record<string, { country: Country; cities: City[] }> = {};
    for (const city of value) {
      const country = selectedCountries.find((c) => c.code === city.countryCode);
      if (!country) continue;
      if (!map[city.countryCode]) map[city.countryCode] = { country, cities: [] };
      map[city.countryCode].cities.push(city);
    }
    return Object.values(map);
  }, [value, selectedCountries]);

  // Build dropdown options grouped by country
  const groupedOptions = useMemo(() => {
    return selectedCountries.map((country) => {
      const topNames = TOP_CITIES[country.code] ?? [];
      const allNames = citiesByCountry[country.code] ?? [];
      const q = query.toLowerCase();

      const topOptions = topNames
        .filter((name) => {
          const key = `${country.code}:${name}`;
          return (
            !selectedKeys.has(key) &&
            (q === "" ||
              name.toLowerCase().includes(q) ||
              (TOP_CITY_DISPLAY[name] ?? "").toLowerCase().includes(q))
          );
        })
        .map((name) => ({
          name,
          display: TOP_CITY_DISPLAY[name] ?? name,
          countryCode: country.code,
          isTop: true,
        }));

      const topNamesSet = new Set(topNames);
      const restOptions = allNames
        .filter((name) => {
          const key = `${country.code}:${name}`;
          return (
            !topNamesSet.has(name) &&
            !selectedKeys.has(key) &&
            (q === "" || name.toLowerCase().includes(q))
          );
        })
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({
          name,
          display: name,
          countryCode: country.code,
          isTop: false,
        }));

      return { country, topOptions, restOptions };
    });
  }, [selectedCountries, citiesByCountry, selectedKeys, query]);

  const hasAnyResults = groupedOptions.some(
    (g) => g.topOptions.length > 0 || g.restOptions.length > 0
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectCity = (city: City) => {
    onChange([...value, city]);
    setQuery("");
    inputRef.current?.focus();
  };

  const addFreeText = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    const countryCode =
      selectedCountries.length === 1
        ? selectedCountries[0].code
        : freeTextCountry || selectedCountries[0]?.code;
    if (!countryCode) return;
    const key = `${countryCode}:${name}`;
    if (selectedKeys.has(key)) { setQuery(""); return; }
    onChange([...value, { name, countryCode }]);
    setQuery("");
    setFreeTextCountry("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) addFreeText(query);
    } else if (e.key === ",") {
      e.preventDefault();
      if (query.trim()) addFreeText(query);
    }
  };

  const removeCity = (countryCode: string, name: string) => {
    onChange(value.filter((c) => !(c.countryCode === countryCode && c.name === name)));
  };

  return (
    <div className="w-full relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Cities{" "}
        <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
      </label>

      {/* Selected chips grouped by country */}
      {chipsByCountry.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {chipsByCountry.map(({ country, cities }) => (
            <div key={country.code} className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-0.5">
                {country.emoji} {country.name}:
              </span>
              {cities.map((city) => (
                <span
                  key={city.name}
                  className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm font-medium rounded-full px-2.5 py-0.5"
                >
                  <span>{city.name}</span>
                  <button
                    type="button"
                    onClick={() => removeCity(city.countryCode, city.name)}
                    className="ml-0.5 text-indigo-400 hover:text-indigo-700 transition-colors leading-none text-base"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className={`min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 flex items-center gap-2 transition-all duration-150 ${
          disabled
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-100 cursor-text"
            : "border-gray-300 hover:border-gray-400 cursor-text"
        }`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        {loading && (
          <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Select a country first" : loading ? "Loading cities…" : "Search cities…"}
          className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent disabled:cursor-not-allowed"
        />
      </div>

      {/* Country picker for free-text entry when multiple countries selected */}
      {!disabled && selectedCountries.length > 1 && query.trim().length > 0 && (
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Add to:</span>
          {selectedCountries.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setFreeTextCountry(c.code)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                freeTextCountry === c.code
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && !loading && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-y-auto"
          style={{ maxHeight: "360px" }}
        >
          {!hasAnyResults && (
            <div className="px-4 py-3 text-sm text-gray-400">
              No cities found{query ? ` for "${query}"` : ""}
            </div>
          )}
          {groupedOptions.map(({ country, topOptions, restOptions }) => {
            if (topOptions.length === 0 && restOptions.length === 0) return null;
            return (
              <div key={country.code}>
                {/* Country header */}
                <div className="px-3 py-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-100 border-b border-slate-200 sticky top-0">
                  {country.emoji} {country.name}
                </div>

                {topOptions.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-xs font-semibold text-amber-600 bg-amber-50 border-b border-amber-100">
                      ⭐ Top Cities
                    </div>
                    {topOptions.map((opt) => (
                      <button
                        key={opt.name}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          selectCity({ name: opt.name, countryCode: opt.countryCode })
                        }
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                      >
                        {opt.display}
                      </button>
                    ))}
                  </>
                )}

                {restOptions.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-xs font-semibold text-gray-400 bg-gray-50 border-b border-gray-100">
                      All Cities
                    </div>
                    {restOptions.map((opt) => (
                      <button
                        key={opt.name}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          selectCity({ name: opt.name, countryCode: opt.countryCode })
                        }
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                      >
                        {opt.display}
                      </button>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {value.length > 0 ? (
          <p className="text-xs text-gray-400">
            {value.length} {value.length === 1 ? "city" : "cities"} selected
          </p>
        ) : <span />}
        {!disabled && (
          <p className="text-xs text-gray-400 italic">
            Press Enter to add any city not in the list
          </p>
        )}
      </div>
    </div>
  );
}
