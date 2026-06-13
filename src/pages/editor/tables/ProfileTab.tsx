import Input from "../../../components/Input";
import { type EditorDataset, setProfile } from "../editorData";
import { DraftNumberInput } from "./shared";

export default function ProfileTab({
  dataset,
  update,
}: {
  dataset: EditorDataset;
  update: (fn: (ds: EditorDataset) => EditorDataset) => void;
}) {
  const user = dataset.user[0];

  return (
    <div className="p-6 flex flex-col gap-4 max-w-sm">
      <h1 className="font-heading font-semibold text-2xl text-zinc-900">Profile</h1>
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Weight<span className="normal-case font-normal ml-1">(kg)</span>
          </span>
          <DraftNumberInput
            min={0}
            step={0.1}
            value={user?.weight ?? 0}
            onCommit={(weight) => update((ds) => setProfile(ds, weight, user?.height))}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl font-body text-zinc-900 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </label>
        <Input
          label="Height"
          hint="(cm, optional)"
          type="number"
          min={0}
          value={user?.height ?? ""}
          onChange={(e) => {
            const height = Number(e.target.value) || undefined;
            update((ds) => setProfile(ds, user?.weight ?? 0, height));
          }}
        />
        <span className="text-xs text-zinc-400 font-medium">
          Weight follows the latest weight log entry when you edit logs.
        </span>
      </div>
    </div>
  );
}
