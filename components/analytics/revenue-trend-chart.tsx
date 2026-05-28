"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

type DataPoint = {
  label: string;
  revenue: number;
  profit: number;
};

export function RevenueTrendChart({ data }: { data: DataPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <p className="text-sm text-ink-muted">Not enough data to chart yet.</p>
    );
  }

  // Chart geometry
  const max = Math.max(
    ...data.map((d) => Math.max(d.revenue, d.profit)),
    1
  );
  const min = Math.min(...data.map((d) => d.profit), 0);
  const range = max - min || 1;

  const chartHeight = 200;
  const barGroupWidth = 100 / data.length;

  // Y position for a value (0 = top, chartHeight = bottom)
  const yFor = (val: number) =>
    chartHeight - ((val - min) / range) * chartHeight;

  const zeroY = yFor(0);

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-navy-700" />
          <span className="text-ink-muted">Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-gold" />
          <span className="text-ink-muted">Net profit</span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 100 ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: chartHeight }}
        >
          {/* Zero baseline */}
          <line
            x1="0"
            y1={zeroY}
            x2="100"
            y2={zeroY}
            stroke="currentColor"
            strokeWidth="0.3"
            className="text-cream-300"
          />

          {data.map((d, i) => {
            const groupX = i * barGroupWidth;
            const barWidth = barGroupWidth * 0.28;
            const gap = barGroupWidth * 0.06;
            const centerOffset = (barGroupWidth - (barWidth * 2 + gap)) / 2;

            const revX = groupX + centerOffset;
            const profX = revX + barWidth + gap;

            const revY = yFor(d.revenue);
            const revHeight = Math.abs(zeroY - revY);

            const profY = d.profit >= 0 ? yFor(d.profit) : zeroY;
            const profHeight = Math.abs(yFor(d.profit) - zeroY);

            return (
              <g
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Hover background */}
                {hovered === i && (
                  <rect
                    x={groupX}
                    y="0"
                    width={barGroupWidth}
                    height={chartHeight}
                    className="text-cream-100"
                    fill="currentColor"
                    opacity="0.5"
                  />
                )}
                {/* Revenue bar */}
                <rect
                  x={revX}
                  y={revY}
                  width={barWidth}
                  height={revHeight}
                  rx="0.5"
                  className="text-navy-700"
                  fill="currentColor"
                />
                {/* Profit bar */}
                <rect
                  x={profX}
                  y={profY}
                  width={barWidth}
                  height={profHeight}
                  rx="0.5"
                  className={d.profit >= 0 ? "text-gold" : "text-red-500"}
                  fill="currentColor"
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hovered !== null && (
          <div
            className="absolute top-0 bg-navy-900 text-cream-50 rounded-md px-3 py-2 text-xs pointer-events-none z-10 shadow-card-hover"
            style={{
              left: `${(hovered + 0.5) * barGroupWidth}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-medium mb-1">{data[hovered].label}</p>
            <p className="whitespace-nowrap">
              Revenue: {formatCurrency(data[hovered].revenue)}
            </p>
            <p className="whitespace-nowrap">
              Profit: {formatCurrency(data[hovered].profit)}
            </p>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="flex mt-2">
        {data.map((d, i) => (
          <div
            key={i}
            className="text-center text-xs text-ink-subtle"
            style={{ width: `${barGroupWidth}%` }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
