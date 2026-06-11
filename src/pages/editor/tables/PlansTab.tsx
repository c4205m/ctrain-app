import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, X, Plus } from "lucide-react";
import type { Plan } from "../../../db/db";
import Input from "../../../components/Input";
import { type EditorDataset, upsertPlan, removePlan } from "../editorData";
import { TabLayout, EmptyHint, thCls, tdCls } from "./shared";

export default function PlansTab({
  dataset,
  update,
}: {
  dataset: EditorDataset;
  update: (fn: (ds: EditorDataset) => EditorDataset) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = dataset.plans.find((p) => p.id === selectedId) ?? null;
  const exerciseName = (id: string) =>
    dataset.exercises.find((ex) => ex.id === id)?.name ?? "(deleted)";

  function handleAdd() {
    const plan: Plan = {
      id: crypto.randomUUID(),
      name: "New plan",
      description: "",
      createdAt: new Date().toISOString(),
      exercises: [],
      duration: 0,
    };
    update((ds) => upsertPlan(ds, plan));
    setSelectedId(plan.id!);
  }

  function patch(changes: Partial<Plan>) {
    if (!selected) return;
    update((ds) => upsertPlan(ds, { ...selected, ...changes }));
  }

  const unusedExercises = selected
    ? dataset.exercises.filter((ex) => !selected.exercises.some((e) => e.exerciseId === ex.id))
    : [];

  return (
    <TabLayout
      title="Plans"
      count={dataset.plans.length}
      onAdd={handleAdd}
      addLabel="Add plan"
      table={
        dataset.plans.length === 0 ? (
          <EmptyHint>No plans yet.</EmptyHint>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>Name</th>
                <th className={thCls}>Description</th>
                <th className={thCls}>Exercises</th>
                <th className={thCls}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {dataset.plans.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedId(p.id!)}
                  className={`border-t border-zinc-50 cursor-pointer ${
                    selectedId === p.id ? "bg-orange-50/60" : "hover:bg-zinc-50"
                  }`}
                >
                  <td className={`${tdCls} font-medium text-zinc-900`}>{p.name}</td>
                  <td className={`${tdCls} text-zinc-500`}>{p.description}</td>
                  <td className={tdCls}>{p.exercises.length}</td>
                  <td className={`${tdCls} text-zinc-500`}>~{p.duration} min</td>
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
              <h2 className="font-heading font-semibold text-lg text-zinc-900">Edit plan</h2>
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
            <Input
              label="Description"
              value={selected.description}
              onChange={(e) => patch({ description: e.target.value })}
            />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Exercises · ~{selected.duration} min
              </span>

              {selected.exercises.map((e, i) => (
                <div
                  key={e.exerciseId}
                  className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2"
                >
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-zinc-800">
                    {exerciseName(e.exerciseId)}
                  </span>
                  <NumberField
                    value={e.sets}
                    label="sets"
                    onChange={(sets) =>
                      patch({
                        exercises: selected.exercises.map((x, j) => (j === i ? { ...x, sets } : x)),
                      })
                    }
                  />
                  <NumberField
                    value={e.reps}
                    label="reps"
                    onChange={(reps) =>
                      patch({
                        exercises: selected.exercises.map((x, j) => (j === i ? { ...x, reps } : x)),
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patch({ exercises: selected.exercises.filter((_, j) => j !== i) })
                    }
                    className="text-zinc-400 hover:text-red-500 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {unusedExercises.length > 0 && (
                <div className="relative">
                  <Plus
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                  />
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      patch({
                        exercises: [
                          ...selected.exercises,
                          { exerciseId: e.target.value, sets: 3, reps: 10 },
                        ],
                      });
                    }}
                    className="w-full appearance-none bg-zinc-50 border border-zinc-200 rounded-xl pl-8 pr-3 py-2.5 text-sm text-zinc-600 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                  >
                    <option value="">Add exercise…</option>
                    {unusedExercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <motion.button
              type="button"
              onClick={() => {
                update((ds) => removePlan(ds, selected.id!));
                setSelectedId(null);
              }}
              whileTap={{ scale: 0.97 }}
              style={{ willChange: "transform" }}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold cursor-pointer"
            >
              <Trash2 size={16} />
              Delete plan
            </motion.button>
          </div>
        )
      }
    />
  );
}

function NumberField({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1">
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-12 bg-white border border-zinc-200 rounded-lg px-1.5 py-1 text-sm text-zinc-900 text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      <span className="text-[10px] text-zinc-400 font-medium">{label}</span>
    </label>
  );
}
