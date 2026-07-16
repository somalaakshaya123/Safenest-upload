"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

const BAND_COLORS: Record<string, string> = {
  Excellent: "#2f7f87",
  Good: "#4b9fa4",
  Fair: "#e78a35",
  "At Risk": "#c96f22",
  Critical: "#b91c1c",
};

export default function ScoreGauge({ score, band, size = 192 }: { score: number; band: string; size?: number }) {
  const color = BAND_COLORS[band] ?? "#2f7f87";
  const data = [{ name: "score", value: score, fill: color }];
  const compact = size < 140;

  return (
    <div className="relative flex items-center justify-center" style={{ height: size, width: size }}>
      <RadialBarChart
        width={size}
        height={size}
        cx="50%"
        cy="50%"
        innerRadius="72%"
        outerRadius="100%"
        barSize={compact ? 9 : 14}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background={{ fill: "#eef7f7" }} dataKey="value" cornerRadius={8} angleAxisId={0} />
      </RadialBarChart>
      <div className="absolute flex flex-col items-center">
        <span className={`font-display font-bold text-ink ${compact ? "text-xl" : "text-4xl"}`}>{score}</span>
        {!compact && <span className="text-xs font-medium text-ink/40">out of 100</span>}
      </div>
    </div>
  );
}
