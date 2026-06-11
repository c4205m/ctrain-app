import { Trash2 } from "lucide-react";
import {
  type EditorDataset,
  addWeightLog,
  updateWeightLog,
  removeWeightLog,
} from "../editorData";
import { TabLayout, EmptyHint, thCls, tdCls } from "./shared";

export default function WeightLogsTab({
  dataset,
  update,
}: {
  dataset: EditorDataset;
  update: (fn: (ds: EditorDataset) => EditorDataset) => void;
}) {
  const sorted = [...dataset.weightLogs].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <TabLayout
      title="Weight logs"
      count={dataset.weightLogs.length}
      onAdd={() => update((ds) => addWeightLog(ds, new Date().toISOString(), 0))}
      addLabel="Add entry"
      table={
        sorted.length === 0 ? (
          <EmptyHint>No weight entries yet.</EmptyHint>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>Date</th>
                <th className={thCls}>Weight (kg)</th>
                <th className={`${thCls} w-16`} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((w) => (
                <tr key={w.id} className="border-t border-zinc-50 hover:bg-zinc-50">
                  <td className={tdCls}>
                    <input
                      type="date"
                      value={w.date.slice(0, 10)}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        update((ds) =>
                          updateWeightLog(ds, w.id!, new Date(e.target.value).toISOString(), w.weight)
                        );
                      }}
                      className="bg-transparent border border-transparent hover:border-zinc-200 rounded-lg px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                    />
                  </td>
                  <td className={tdCls}>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={w.weight}
                      onChange={(e) =>
                        update((ds) =>
                          updateWeightLog(ds, w.id!, w.date, Math.max(0, Number(e.target.value) || 0))
                        )
                      }
                      className="w-24 bg-transparent border border-transparent hover:border-zinc-200 rounded-lg px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </td>
                  <td className={tdCls}>
                    <button
                      type="button"
                      onClick={() => update((ds) => removeWeightLog(ds, w.id!))}
                      className="text-zinc-300 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
      panel={null}
    />
  );
}
