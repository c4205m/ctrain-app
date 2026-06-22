import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Model, { type IExerciseData, type Muscle, ModelType } from "react-body-highlighter";
import { type MuscleGroup } from "../db/types";
import { slugToTitle, MUSCLE_COLOR } from "../utils/displayUtil";
import Chip from "./Chip";
import SegmentedControl from "./SegmentedControl";

const VALID_MUSCLES = new Set<string>(Object.keys(MUSCLE_COLOR));

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

interface MusclePickerProps {
  muscles: MuscleGroup[];
  onChange: (muscles: MuscleGroup[]) => void;
  modelWidth?: number;
  showFocus?: boolean;
}

export default function MusclePicker({ muscles, onChange, modelWidth = 200, showFocus = false }: MusclePickerProps) {
  const [side, setSide] = useState<"front" | "back">("front");

  const bodyData: IExerciseData[] = muscles.flatMap((m, i) =>
    Array.from({ length: i + 1 }, (_, j) => ({ name: `${m}-${j}`, muscles: [m as Muscle] }))
  );

  function handleMuscleClick({ muscle }: { muscle: string }) {
    if (!VALID_MUSCLES.has(muscle)) return;
    onChange(toggle(muscles, muscle as MuscleGroup));
  }

  return (
    <div>
      <SegmentedControl
        options={["front", "back"]}
        selected={side}
        onChange={setSide}
      />

      <div className="flex justify-center mb-2">
        <Model
          data={bodyData}
          highlightedColors={muscles.map((m) => MUSCLE_COLOR[m])}
          type={side === "front" ? ModelType.ANTERIOR : ModelType.POSTERIOR}
          style={{ width: modelWidth }}
          onClick={handleMuscleClick}
        />
      </div>

      <AnimatePresence>
        {muscles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 p-1.5">
              {muscles.map((m, i) => {
                const isFocus = showFocus && i === 0;
                return (
                  <motion.button
                    key={m}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    type="button"
                    style={{ willChange: "transform" }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() =>
                      showFocus
                        ? onChange([m, ...muscles.filter((x) => x !== m)])
                        : onChange(toggle(muscles, m))
                    }
                    className={showFocus && !isFocus ? "opacity-50" : undefined}
                  >
                    <Chip
                      variant="custom"
                      customClass={`text-white border-none ${isFocus ? "ring-2 ring-offset-1" : ""}`}
                      style={{
                        backgroundColor: MUSCLE_COLOR[m],
                        ...(isFocus ? { ["--tw-ring-color" as string]: MUSCLE_COLOR[m] } : {}),
                      }}
                    >
                      {slugToTitle(m)}
                    </Chip>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
