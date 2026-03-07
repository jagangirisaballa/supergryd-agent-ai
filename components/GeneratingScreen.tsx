"use client";

import { useState, useEffect, useMemo } from "react";

type Props = {
  selectedCountries: { name: string }[];
  budget: string;
  occasion: string;
  travelerTypes: string[];
};

export default function GeneratingScreen({ selectedCountries, budget, occasion, travelerTypes }: Props) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const countryNames = selectedCountries.map((c) => c.name).join(" & ") || "your destination";

  const messages = useMemo(() => {
    const base = [
      `Mapping the geography of ${countryNames}...`,
      "Clustering activities by neighbourhood...",
      "Checking transit connectors between locations...",
      "Applying your budget preferences...",
      "Verifying landmarks and attractions...",
      "Sequencing your days for a natural flow...",
      "Balancing sightseeing, dining, and downtime...",
    ];

    if (budget === "luxury") {
      base.push(
        "Arranging private drivers and transfers...",
        "Selecting 5-star properties for each night...",
        "Curating exclusive and private-access experiences..."
      );
    } else if (budget === "comfort") {
      base.push(
        "Sourcing the best mid-range stays...",
        "Scheduling SIC transfers between key spots..."
      );
    } else if (budget === "budget") {
      base.push(
        "Finding the best street food stops and markets...",
        "Mapping efficient public transit routes..."
      );
    }

    const occ = occasion.toLowerCase();
    if (occ === "honeymoon" || occ === "anniversary") {
      base.push(
        "Finding the best sunset viewpoints...",
        "Arranging romantic dining experiences...",
        "Handpicking intimate and uncrowded spots..."
      );
    } else if (occ === "babymoon") {
      base.push(
        "Planning a gentle pace with spa time...",
        "Ensuring comfort and easy transport throughout..."
      );
    } else if (occ === "adventure") {
      base.push(
        "Scouting the best adventure experiences...",
        "Sourcing thrills fit for your destination..."
      );
    } else if (occ === "religious/pilgrimage") {
      base.push(
        "Identifying key temples, shrines, and sacred sites...",
        "Scheduling early morning prayer slots..."
      );
    }

    const types = travelerTypes.map((t) => t.toLowerCase());
    if (types.some((t) => t.includes("infant") || t.includes("toddler"))) {
      base.push(
        "Planning rest breaks for your little one...",
        "Keeping the pace gentle for young travelers..."
      );
    }
    if (types.some((t) => t.includes("family") || t.includes("kids"))) {
      base.push("Finding family-friendly activities for every day...");
    }
    if (types.some((t) => t.includes("senior"))) {
      base.push(
        "Adjusting the pace for a comfortable journey...",
        "Prioritising accessible and easy-going activities..."
      );
    }

    return base;
  }, [countryNames, budget, occasion, travelerTypes]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center gap-6 text-center">
      {/* Pulsing icon */}
      <div className="text-4xl animate-pulse select-none">🧭</div>

      {/* Rotating message */}
      <p
        className="text-base font-semibold text-slate-700 min-h-[1.75rem] transition-opacity duration-400"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {messages[index]}
      </p>

      {/* Static line */}
      <p className="text-sm text-slate-400 font-normal">
        Crafting your personalised itinerary — this takes about 20 seconds
      </p>
    </div>
  );
}
