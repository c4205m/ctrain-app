import { type Log } from "../db/db";
import Input from "./Input";
import NumberInput from "./NumberInput";
import SegmentedControl from "./SegmentedControl";

const SET_TYPES: Log["setType"][] = ["rep", "distance", "duration"];
const SET_TYPE_LABELS: Record<Log["setType"], string> = {
  rep: "Reps",
  distance: "Distance (m)",
  duration: "Duration (s)",
};

// Keep the duration invariant LogModal enforces: duration logs mirror effort,
// other types keep their optional set-duration; bodyweight pins weight to the user.
function normalizeLog(log: Log, userWeight: number): Log {
  const weight = log.bodyweight ? userWeight : log.weight;
  if (log.setType === "duration") return { ...log, weight, duration: log.effortPerSet };
  return { ...log, weight };
}

export default function LogEditor({
  log,
  userWeight,
  onChange,
  onClear,
}: {
  log: Log;
  userWeight: number;
  onChange: (log: Log) => void;
  onClear: () => void;
}) {
  function emit(changes: Partial<Log>) {
    onChange(normalizeLog({ ...log, ...changes }, userWeight));
  }

  return (
    <div className="flex flex-col gap-3 bg-zinc-50 rounded-xl p-3">
      <SegmentedControl
        options={SET_TYPES}
        selected={log.setType}
        onChange={(setType) => emit({ setType })}
      />

      <div className="flex gap-3">
        <NumberInput
          label="Sets"
          inputMode="numeric"
          decimals={0}
          min={1}
          max={20}
          value={log.sets}
          onChange={(v) => emit({ sets: v ?? 0 })}
          wrapperClassName="flex-1"
        />
        <NumberInput
          label={SET_TYPE_LABELS[log.setType]}
          inputMode={log.setType === "rep" ? "numeric" : "decimal"}
          decimals={log.setType === "rep" ? 0 : 2}
          min={0}
          step={log.setType === "rep" ? 1 : 0.01}
          value={log.effortPerSet}
          onChange={(v) => emit({ effortPerSet: v ?? 0 })}
          wrapperClassName="flex-1"
        />
      </div>

      {log.setType !== "duration" && (
        <NumberInput
          label="Set duration (s)"
          hint="(optional)"
          inputMode="decimal"
          decimals={2}
          min={0}
          step={0.01}
          placeholder="e.g. 45"
          value={log.duration}
          emptyValue={undefined}
          onChange={(v) => emit({ duration: v })}
        />
      )}

      <NumberInput
        label="Weight (kg)"
        inputMode="decimal"
        decimals={2}
        min={0}
        value={log.bodyweight ? userWeight : log.weight}
        disabled={log.bodyweight}
        onChange={(v) => emit({ weight: v ?? 0 })}
      />

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={log.bodyweight}
          onChange={(e) => emit({ bodyweight: e.target.checked })}
          className="w-4 h-4 accent-orange-500"
        />
        <span className="text-sm text-zinc-600">Bodyweight</span>
      </label>

      <Input
        label="Date"
        type="date"
        value={log.date.slice(0, 10)}
        onChange={(e) => {
          if (!e.target.value) return;
          emit({ date: new Date(e.target.value).toISOString() });
        }}
      />

      <button
        type="button"
        onClick={onClear}
        className="self-start text-sm text-zinc-500 font-medium underline underline-offset-2 cursor-pointer hover:text-zinc-700"
      >
        Clear log
      </button>
    </div>
  );
}
