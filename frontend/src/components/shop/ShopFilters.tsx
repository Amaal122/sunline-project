"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { FitType } from "@/types/product";
import { colorToHex, COLOR_MAP } from "@/lib/colors";

const FITS: FitType[] = ["Straight", "Wide Leg", "Skinny", "Mom Jeans", "Flare"];
const SIZES = ["34", "36", "38", "40", "42"]; // strings — matches the API exactly

export default function ShopFilters({
  activeFilters,
}: {
  activeFilters: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  const pathname = usePathname();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(activeFilters as Record<string, string>);
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [activeFilters, pathname, router]
  );

  return (
    <aside className="filters">
      <div className="filter-group">
        <h5>Fit</h5>
        {FITS.map((f) => (
          <label key={f} className="filter-opt">
            <input
              type="checkbox"
              checked={activeFilters.fit === f}
              onChange={(e) => updateFilter("fit", e.target.checked ? f : null)}
            />
            {f}
          </label>
        ))}
      </div>

      <div className="filter-group">
        <h5>Size</h5>
        {SIZES.map((s) => (
          <label key={s} className="filter-opt">
            <input
              type="checkbox"
              checked={activeFilters.size === s}
              onChange={(e) => updateFilter("size", e.target.checked ? s : null)}
            />
            EU {s}
          </label>
        ))}
      </div>

      <div className="filter-group">
        <h5>Color</h5>
        <div className="color-filters" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.keys(COLOR_MAP).map((c) => (
            <div
              key={c}
              className={`color-dot ${activeFilters.color === c ? "selected" : ""}`}
              style={{
                background: colorToHex(c),
                width: 22,
                height: 22,
                borderRadius: "50%",
                cursor: "pointer",
              }}
              onClick={() => updateFilter("color", activeFilters.color === c ? null : c)}
              title={c}
            />
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h5>Availability</h5>
        <label className="filter-opt">
          <input
            type="checkbox"
            checked={activeFilters.in_stock === "true"}
            onChange={(e) => updateFilter("in_stock", e.target.checked ? "true" : null)}
          />
          In stock only
        </label>
      </div>

      <button
        className="btn btn-outline btn-sm btn-block"
        onClick={() => router.push(pathname)}
      >
        Clear Filters
      </button>
    </aside>
  );
}
