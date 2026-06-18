import NumberInput from "../../../components/NumberInput";
import { type EditorDataset, setProfile } from "../editorData";

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
        <NumberInput
          label="Weight"
          hint="(kg)"
          inputMode="decimal"
          decimals={1}
          min={0}
          step={0.1}
          value={user?.weight ?? 0}
          onChange={(v) => update((ds) => setProfile(ds, v ?? 0, user?.height))}
        />
        <NumberInput
          label="Height"
          hint="(cm, optional)"
          inputMode="numeric"
          min={0}
          value={user?.height}
          emptyValue={undefined}
          onChange={(v) => update((ds) => setProfile(ds, user?.weight ?? 0, v))}
        />
        <span className="text-xs text-zinc-400 font-medium">
          Weight follows the latest weight log entry when you edit logs.
        </span>
      </div>
    </div>
  );
}
