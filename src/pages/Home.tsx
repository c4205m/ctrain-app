import { useMemo, useState } from "react";
import ExerciseCardCompact from "../components/ExerciseCardCompact";
import StatTile from "../components/StatTile";
import RecentLogs from "../components/RecentLogs";
import MuscleHeatmap from "../components/MuscleHeatmap";
import LogModal from "../components/LogModal";
import { formatDate, getGreeting } from "../utils/timeUtil";
import { computeScores } from "../utils/displayUtil";
import {
  computeStreak,
  computeWeeklySets,
  computeWeeklyVolume,
  computeMonthlyPRs,
  computeActiveExercises,
  computeDaysSinceLastLog,
  computeMostTrainedMuscle,
  computeMostNeglectedMuscle,
} from "../utils/statsUtil";
import { useSettingsStore } from "../store/settingsStore";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Exercise } from "../db/db";

export default function Home() {
  const [logTarget, setLogTarget] = useState<Exercise | null>(null);
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], []);
  const user = useLiveQuery(() => db.user.toArray().then((u) => u[0] ?? null), []);
  const scores = useMemo(() => computeScores(exercises), [exercises]);
  const vis = useSettingsStore((s) => s.visibleStats);

  const bmi = useMemo(() => {
    if (!user?.weight || !user?.height) return null;
    return (user.weight / Math.pow(user.height / 100, 2)).toFixed(1);
  }, [user]);

  const stats = useMemo(() => ({
    streak: computeStreak(exercises),
    weeklySets: computeWeeklySets(exercises),
    weeklyVolume: Math.round(computeWeeklyVolume(exercises)),
    monthlyPRs: computeMonthlyPRs(exercises),
    activeExercises: computeActiveExercises(exercises),
    daysSinceLastLog: computeDaysSinceLastLog(exercises) ?? "—",
    mostTrainedMuscle: computeMostTrainedMuscle(exercises) ?? "—",
    mostNeglectedMuscle: computeMostNeglectedMuscle(exercises) ?? "—",
  }), [exercises]);

  const neglectedExercises = useMemo(() => {
    const COLD = 14;
    const NEVER = 9999;
    const daysAgo = (ex: (typeof exercises)[number]) =>
      ex.latestLog?.date
        ? (Date.now() - new Date(ex.latestLog.date).getTime()) / 86_400_000
        : NEVER;
    return exercises
      .filter((ex) => daysAgo(ex) > COLD)
      .sort((a, b) => daysAgo(b) - daysAgo(a));
  }, [exercises]);

  return (
    <div className="p-4">
      {/* GREETINGS */}
      <div className="mb-6">
        <h1 className="font-heading font-bold text-[32px] leading-none text-zinc-900 mb-1">
          {" "}
          {getGreeting()}{" "}
        </h1>
        <p className="text-sm text-zinc-400 font-medium"> {formatDate()} </p>
      </div>

      {/* STATS */}
      <h2 className="font-heading font-semibold text-base text-zinc-900 mb-3">Stats</h2>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {vis.streak && <StatTile value={`${stats.streak}d`} label="Streak" />}
        {vis.weeklySets && <StatTile value={stats.weeklySets} label="Sets this week" />}
        {vis.weeklyVolume && <StatTile value={stats.weeklyVolume} label="Volume this week (kg)" />}
        {vis.monthlyPRs && <StatTile value={stats.monthlyPRs} label="PRs this month" />}
        {vis.activeExercises && <StatTile value={stats.activeExercises} label="Active exercises" />}
        {vis.daysSinceLastLog && <StatTile value={stats.daysSinceLastLog} label="Days since last log" />}
        {vis.mostTrainedMuscle && <StatTile value={stats.mostTrainedMuscle} label="Most trained muscle" />}
        {vis.mostNeglectedMuscle && <StatTile value={stats.mostNeglectedMuscle} label="Most neglected muscle" />}
        {(vis.weight || vis.height || vis.bmi) && (user?.weight || user?.height || bmi) && (
          <StatTile label="" className="col-span-2">
            <div className="flex gap-6 w-full justify-center">
              {vis.weight && user?.weight && (
                <div className="flex flex-col items-center">
                  <span className="font-heading font-bold text-2xl text-orange-500 leading-tight">{user.weight} <span className="text-sm font-medium text-zinc-400">kg</span></span>
                  <span className="text-xs text-zinc-500">Weight</span>
                </div>
              )}
              {vis.height && user?.height && (
                <div className="flex flex-col items-center">
                  <span className="font-heading font-bold text-2xl text-orange-500 leading-tight">{user.height} <span className="text-sm font-medium text-zinc-400">cm</span></span>
                  <span className="text-xs text-zinc-500">Height</span>
                </div>
              )}
              {vis.bmi && bmi && (
                <div className="flex flex-col items-center">
                  <span className="font-heading font-bold text-2xl text-orange-500 leading-tight">{bmi}</span>
                  <span className="text-xs text-zinc-500">BMI</span>
                </div>
              )}
            </div>
          </StatTile>
        )}
        <StatTile label="Recent Muscles" className="col-span-2">
          <MuscleHeatmap scores={scores} modelWidth={70} dual={true} showLegend={true} showCoverage={true} />
        </StatTile>
      </div>

      {/* RECOMMENDS */}
      {neglectedExercises.length > 0 && (
        <>
          <h2 className="font-heading font-semibold text-base text-zinc-900 mb-3">Long time...</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-6">
            {neglectedExercises.map((x, i) => (
              <ExerciseCardCompact key={i} className="h-36 w-36" exercise={x} showNeglect onTap={setLogTarget} />
            ))}
          </div>
        </>
      )}

      {/* RECENT LOGS */}
      <div className="mb-6">
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-3">Recent Logs</h2>
        <RecentLogs exercises={exercises} />
      </div>
      <LogModal
        exercise={logTarget}
        isOpen={logTarget !== null}
        onClose={() => setLogTarget(null)}
      />
    </div>
  );
}
