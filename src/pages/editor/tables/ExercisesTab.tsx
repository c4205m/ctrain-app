import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Trash2, X } from "lucide-react";
import type { Exercise } from "../../../db/db";
import { DifficultyLevels } from "../../../db/types";
import { slugToTitle, MUSCLE_COLOR, DIFFICULTY_BADGE } from "../../../utils/displayUtil";
import Input from "../../../components/Input";
import Chip from "../../../components/Chip";
import SegmentedControl from "../../../components/SegmentedControl";
import MusclePicker from "../../../components/MusclePicker";
import { type EditorDataset, upsertExercise, removeExercise, toggleItem } from "../editorData";
import { TabLayout, EmptyHint, thCls, tdCls } from "./shared";

const DIFFICULTIES = Object.values(DifficultyLevels);

export default function ExercisesTab({
  dataset,
  update,
}: {
  dataset: EditorDataset;
  update: (fn: (ds: EditorDataset) => EditorDataset) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = dataset.exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );
  const selected = dataset.exercises.find((ex) => ex.id === selectedId) ?? null;

  function handleAdd() {
    const ex: Exercise = {
      id: crypto.randomUUID(),
      name: "New exercise",
      muscles: [],
      difficulty: "Beginner",
      tools: [],
      movementType: [],
    };
    update((ds) => upsertExercise(ds, ex));
    setSelectedId(ex.id!);
  }

  function patch(changes: Partial<Exercise>) {
    if (!selected) return;
    update((ds) => upsertExercise(ds, { ...selected, ...changes }));
  }

  return (
    <TabLayout
      title="Exercises"
      count={dataset.exercises.length}
      onAdd={handleAdd}
      addLabel="Add exercise"
      toolbar={
        <Input
          icon={<Search size={16} />}
          inputSize="sm"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          wrapperClassName="w-64"
        />
      }
      table={
        filtered.length === 0 ? (
          <EmptyHint>{search ? "No exercises match." : "No exercises yet."}</EmptyHint>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>Name</th>
                <th className={thCls}>Difficulty</th>
                <th className={thCls}>Muscles</th>
                <th className={thCls}>Tools</th>
                <th className={thCls}>Movement</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ex) => (
                <tr
                  key={ex.id}
                  onClick={() => setSelectedId(ex.id!)}
                  className={`border-t border-zinc-50 cursor-pointer ${
                    selectedId === ex.id ? "bg-orange-50/60" : "hover:bg-zinc-50"
                  }`}
                >
                  <td className={`${tdCls} font-medium text-zinc-900`}>{ex.name}</td>
                  <td className={tdCls}>
                    <Chip variant="custom" size="sm" customClass={DIFFICULTY_BADGE[ex.difficulty]?.cls ?? ""}>
                      {DIFFICULTY_BADGE[ex.difficulty]?.label ?? ex.difficulty}
                    </Chip>
                  </td>
                  <td className={tdCls}>
                    <div className="flex flex-wrap gap-1">
                      {ex.muscles.map((m) => (
                        <Chip
                          key={m}
                          variant="custom"
                          size="sm"
                          customClass="text-white border-none"
                          style={{ backgroundColor: MUSCLE_COLOR[m] }}
                        >
                          {slugToTitle(m)}
                        </Chip>
                      ))}
                    </div>
                  </td>
                  <td className={`${tdCls} text-zinc-500`}>{ex.tools.join(", ")}</td>
                  <td className={`${tdCls} text-zinc-500`}>{ex.movementType.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
      panel={
        selected && (
          <div className="p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-lg text-zinc-900">Edit exercise</h2>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <Input
              label="Name"
              value={selected.name}
              onChange={(e) => patch({ name: e.target.value })}
            />

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Difficulty
              </span>
              <SegmentedControl
                options={DIFFICULTIES}
                selected={selected.difficulty}
                onChange={(difficulty) => patch({ difficulty })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Muscles
              </span>
              <MusclePicker
                muscles={selected.muscles}
                onChange={(muscles) => patch({ muscles })}
                modelWidth={160}
              />
            </div>

            <TagToggleGroup
              label="Tools"
              all={dataset.equipment.map((e) => e.name)}
              active={selected.tools}
              onToggle={(name) => patch({ tools: toggleItem(selected.tools, name) })}
            />

            <TagToggleGroup
              label="Move"
              all={dataset.movementTypes.map((m) => m.name)}
              active={selected.movementType}
              onToggle={(name) => patch({ movementType: toggleItem(selected.movementType, name) })}
            />

            <Input
              label="URL"
              hint="(optional)"
              value={selected.url ?? ""}
              onChange={(e) => patch({ url: e.target.value || undefined })}
            />

            {(selected.latestLog || selected.highestLog) && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Logs
                </span>
                <span className="text-sm text-zinc-500">
                  {selected.latestLog && <>Latest: {selected.latestLog.date.slice(0, 10)}. </>}
                  {selected.highestLog && <>Best: {selected.highestLog.date.slice(0, 10)}.</>}
                </span>
                <button
                  type="button"
                  onClick={() => patch({ latestLog: undefined, highestLog: undefined })}
                  className="self-start text-sm text-zinc-500 font-medium underline underline-offset-2 cursor-pointer hover:text-zinc-700"
                >
                  Clear logs
                </button>
              </div>
            )}

            <motion.button
              type="button"
              onClick={() => {
                update((ds) => removeExercise(ds, selected.id!));
                setSelectedId(null);
              }}
              whileTap={{ scale: 0.97 }}
              style={{ willChange: "transform" }}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold cursor-pointer"
            >
              <Trash2 size={16} />
              Delete exercise
            </motion.button>
          </div>
        )
      }
    />
  );
}

function TagToggleGroup({
  label,
  all,
  active,
  onToggle,
}: {
  label: string;
  all: string[];
  active: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {all.length === 0 && <span className="text-sm text-zinc-400">None defined.</span>}
        {all.map((name) => (
          <button key={name} type="button" onClick={() => onToggle(name)} className="cursor-pointer">
            <Chip variant={active.includes(name) ? "primary" : "secondary"}>{name}</Chip>
          </button>
        ))}
      </div>
    </div>
  );
}
