import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Model, { type IExerciseData, type Muscle, ModelType } from "react-body-highlighter";
import type { MuscleGroup } from "../db/types";
import { MuscleGroups } from "../db/types";

const TOTAL_MUSCLES = Object.keys(MuscleGroups).length;

const HEATMAP_COLORS = ["#4f46e5", "#7c3aed", "#e11d48"];

type LegendPosition = "top" | "bottom" | "left" | "right";

interface MuscleHeatmapProps {
  scores: Partial<Record<MuscleGroup, number>>;
  hotThreshold?: number;
  warmThreshold?: number;
  coldThreshold?: number;
  modelWidth?: number;
  dual?: boolean;
  legendPosition?: LegendPosition;
  showLegend?: boolean;
  showCoverage?: boolean;
}

export default function MuscleHeatmap({
  scores,
  hotThreshold = 2,
  warmThreshold = 5,
  coldThreshold = 14,
  modelWidth = 200,
  dual = false,
  legendPosition = "bottom",
  showLegend = true,
  showCoverage = false,
}: MuscleHeatmapProps) {
  const [side, setSide] = useState<"front" | "back">("front");

  const coverage = useMemo(() => {
    const trained = Object.values(scores).filter((v) => v !== undefined && v <= coldThreshold).length;
    return Math.round((trained / TOTAL_MUSCLES) * 100);
  }, [scores, coldThreshold]);

  useEffect(() => { setSide("front"); }, [dual]);

  const data = useMemo<IExerciseData[]>(() => {
    const result: IExerciseData[] = [];
    for (const [muscle, days] of Object.entries(scores) as [MuscleGroup, number | undefined][]) {
      if (days === undefined || days > coldThreshold) continue;
      const depth = days <= hotThreshold ? 3 : days <= warmThreshold ? 2 : 1;
      for (let i = 0; i < depth; i++) {
        // muscle slugs from MuscleGroups match react-body-highlighter's Muscle union
        result.push({ name: `${muscle}-heat-${i}`, muscles: [muscle as Muscle] });
      }
    }
    return result;
  }, [scores, hotThreshold, warmThreshold, coldThreshold]);

  const isHorizontal = legendPosition === "left" || legendPosition === "right";

  const legend = showLegend ? (
    <div className={`flex gap-1.5 ${isHorizontal ? "flex-col" : "flex-wrap justify-center"}`}>
      {([
        { color: "#e11d48", label: `≤${hotThreshold}d` },
        { color: "#7c3aed", label: `≤${warmThreshold}d` },
        { color: "#4f46e5", label: `≤${coldThreshold}d` },
      ] as const).map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-[10px] text-zinc-400 font-medium">{label}</span>
        </div>
      ))}
    </div>
  ) : null;

  const toggleSide = () => setSide(s => s === "front" ? "back" : "front");

  const model = dual ? (
    <div className="flex justify-center gap-2">
      {([
        { type: ModelType.ANTERIOR, label: "Front" },
        { type: ModelType.POSTERIOR, label: "Back" },
      ] as const).map(({ type, label }) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-zinc-400 font-medium">{label}</span>
          <Model data={data} highlightedColors={HEATMAP_COLORS} type={type} style={{ width: modelWidth }} />
        </div>
      ))}
    </div>
  ) : (
    <div
      role="button"
      aria-label={`Muscle heatmap, ${side} view. Tap to toggle.`}
      tabIndex={0}
      className="flex justify-center cursor-pointer select-none"
      onClick={toggleSide}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleSide()}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={side}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ willChange: "transform" }}
        >
          <Model
            data={data}
            highlightedColors={HEATMAP_COLORS}
            type={side === "front" ? ModelType.ANTERIOR : ModelType.POSTERIOR}
            style={{ width: modelWidth }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );

  const content = !legend ? model :
    legendPosition === "left"  ? <div className="flex items-center gap-3">{legend}{model}</div> :
    legendPosition === "right" ? <div className="flex items-center gap-3">{model}{legend}</div> :
    legendPosition === "top"   ? <div className="flex flex-col items-center gap-2">{legend}{model}</div> :
                                 <div className="flex flex-col items-center gap-2">{model}{legend}</div>;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-1">
      {content}
      {showCoverage && (
        <span className="text-xs text-zinc-400 font-medium">{coverage}% coverage</span>
      )}
    </div>
  );
}
