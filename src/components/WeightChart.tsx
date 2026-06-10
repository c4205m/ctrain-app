import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import type { TooltipProps } from "recharts";
import { formatDateDM } from "../utils/timeUtil";

interface WeightChartProps {
  data: { date: string; weight: number }[];
  height?: number;
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { date: string; weight: number };
  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-md px-3 py-2">
      <p className="text-xs text-zinc-400">{formatDateDM(point.date)}</p>
      <p className="text-sm font-bold text-zinc-900 leading-tight">
        {point.weight} <span className="text-xs font-medium text-zinc-400">kg</span>
      </p>
    </div>
  );
}

export default function WeightChart({ data, height = 100 }: WeightChartProps) {
  if (data.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-zinc-400 w-full text-center px-4">
        Log your weight a few times to see your trend
      </div>
    );
  }

  const values = data.map((d) => d.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.1 || 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f4f4f5" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateDM}
          tick={{ fontSize: 10, fill: "#a1a1aa" }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis domain={[min - pad, max + pad]} hide />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#f97316", strokeWidth: 1, strokeDasharray: "4 4" }} />
        <Area
          type="monotone"
          dataKey="weight"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#weightFill)"
          activeDot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
          animationDuration={600}
        >
          <LabelList dataKey="weight" position="top" offset={8} style={{ fontSize: 10, fontWeight: 600, fill: "#71717a" }} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
