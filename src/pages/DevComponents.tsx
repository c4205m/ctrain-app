import { type Exercise, type Plan } from "../db/db";
import ExerciseCard from "../components/ExerciseCard";
import ExerciseCardCompact from "../components/ExerciseCardCompact";
import StatTile from "../components/StatTile";
import Chip from "../components/Chip";
import ExerciseTab from "../lists/ExerciseTab";
import PlanCard from "../components/PlanCard";
import PlansTab from "../lists/PlanTab";
import { CardStack } from "../components/CardStack";

const FAKE_EXERCISES: Exercise[] = [
  {
    id: "0",
    name: "Push-up",
    muscles: ["chest", "triceps", "front-deltoids"],
    difficulty: "Beginner",
    tools: ["None", "Kettlebell"],
    movementType: ["Push"],
  },
  {
    id: "1",
    name: "No-Log",
    muscles: ["quadriceps", "gluteal", "hamstring"],
    difficulty: "Advanced",
    tools: ["None"],
    movementType: ["Squat"],
    url: "www.duckduckgo.com",
  },
  {
    id: "2",
    name: "Logged",
    muscles: ["quadriceps", "gluteal", "hamstring"],
    difficulty: "Intermediate",
    tools: ["Dumbbells"],
    movementType: ["Squat"],
    highestLog: {
      date: "01-01-2000",
      sets: 1,
      setType: "distance",
      effortPerSet: 10,
      weight: 100,
      bodyweight: true,
    },
    latestLog: {
      date: "01-11-2000",
      sets: 1,
      setType: "distance",
      effortPerSet: 10,
      weight: 10,
      bodyweight: false,
    },
  },
];

const FAKE_PLANS: Plan[] = [
  {
    id: "0",
    name: "Push Day",
    description: "Chest, shoulders and triceps focused session",
    createdAt: "2025-01-10",
    duration: 120,
    exercises: [
      { exerciseId: "0", sets: 4, reps: 12 },
      { exerciseId: "2", sets: 3, reps: 10 },
    ],
  },
  {
    id: "1",
    name: "Leg Day",
    description: "Full lower body — quads, glutes, hamstrings",
    createdAt: "2025-01-12",
    duration: 120,
    exercises: [
      { exerciseId: "1", sets: 4, reps: 15 },
      { exerciseId: "2", sets: 3, reps: 12 },
    ],
  },
  {
    id: "2",
    name: "Full Body",
    description: "Compound movements hitting everything",
    createdAt: "2025-02-01",
    duration: 120,
    exercises: [
      { exerciseId: "0", sets: 3, reps: 10 },
      { exerciseId: "1", sets: 3, reps: 12 },
      { exerciseId: "2", sets: 3, reps: 8 },
    ],
  },
]

export default function DevComponents() {
  // const [expandedId, setExpandedId] = useState<string | null>(null);
  const sectionCls = "bg-zinc-100 rounded-2xl p-4 shadow-xl mb-6";

  return (
    <div className="p-4 flex flex-col gap-2">
      <h1 className="font-heading font-semibold text-2xl text-zinc-900 mb-1">Design System</h1>
      <div className={`${sectionCls}`}>
        {/* STATS */}
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-3">Stats</h2>
        <div className="grid grid-cols-2 gap-2 mb-6">
          <StatTile value={100} label="number" />
          <StatTile value={"TEXT"} label="string" />
        </div>

        {/* EXERCISE CARD */}
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-3">Exercise Card Variants</h2>
        <div className="flex flex-col gap-2 mb-3">
          <ExerciseCard
            exercise={FAKE_EXERCISES[0]}
            isExpanded={false}
            onToggle={()=>{}}
          />
          <ExerciseCardCompact 
            exercise={FAKE_EXERCISES[0]}
            hideCollapsedChips={false}
            snap="snap-center"
            onTap={(x)=>alert(`Tapped: ${x.name}`)}
          />
          <ExerciseCardCompact 
            exercise={FAKE_EXERCISES[0]}
            hideCollapsedChips={true}
            snap="snap-center"
            onTap={(x)=>alert(`Tapped: ${x.name}`)}
          />
        </div>

        {/* PLAN CARDS */}
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-3">Plan Card</h2>
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 snap-x snap-mandatory">
            {FAKE_PLANS.map((x, i) => (
              <PlanCard
                key={i}
                plan={x}
                exercises={FAKE_EXERCISES}
                isExpanded={true}
                isEditing={true}
                onToggle={()=>{}}
                onEditRequest={()=>{}}
                onLog={()=>{}}
                onRequestPicker={()=>{}}
                onStartWorkout={()=>{}}
              />
            ))}
          </div>
        </div>

        {/* Chips */}
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-3">Chips</h2>
        <div className={`flex flex-wrap gap-2 mb-3`}>
          <Chip variant="primary"> primary </Chip>
          <Chip variant="secondary"> secondary </Chip>
          <Chip variant="success"> success </Chip>
          <Chip variant="warning"> warning </Chip>
          <Chip variant="info"> info </Chip>
          <Chip variant="danger"> danger </Chip>
          <Chip variant="outline"> outline </Chip>
          <Chip variant="disabled"> disabled </Chip>
          <Chip variant="custom" customClass="bg-amber-400 border-none">custom</Chip>
          <Chip variant="custom" customClass="bg-gray-400 border-none text-zinc-100">custom</Chip>
          <Chip variant="custom" customClass="bg-rose-400 border-red-600 text-lime-200"> custom </Chip>
        </div>
      </div>

      {/* Exercises List */}
      <div className={`${sectionCls}`}>
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-3">Exercises List</h2>
        <div className="max-h-125 overflow-auto">
          <ExerciseTab
            onAdd={() => alert(`Add new exercise`)}
            onEdit={(x) => alert(`Edit exercise "${x.name}"`)}
            onLog={(x) => alert(`Add log for "${x.name}"`)}
          />
        </div>
      </div>

      {/* Plans List */}
      <div className={`${sectionCls}`}>
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-3">Plans List</h2>
        <div className="max-h-125 overflow-auto">
          <PlansTab
            onAdd={() => alert(`Add new exercise`)}
            onRequestPicker={(x) => alert(`Requested: ${x}`)}
            onLog={(x) => alert(`Add log for "${x.name}"`)}
            onStartWorkout={(x) => alert(`Strat for "${x.name}"`)}
          />
        </div>
      </div>
      
      {/* Stacked Cards */}
      <div className={`${sectionCls}`}>
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-3">Stacked Cards</h2>
        <CardStack
          cards={FAKE_EXERCISES}
        />
      </div>
    </div>
  );
}
