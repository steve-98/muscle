import { getWorkout } from "../data/program";
import type { AppState, PerformedSet, WorkoutSession } from "../types";

export function startWorkout(state: AppState, week: number, day: number, now = new Date()): AppState {
  const plan = getWorkout(week, day);
  if (!plan) throw new Error("That workout does not exist in the program.");
  const existing = state.workoutSessions.find((session) =>
    session.id === state.program.activeSessionId && !session.completedAt && !session.skipped
  );
  if (existing && existing.week === week && existing.day === day) return state;
  if (existing) throw new Error("Continue or finish your active workout before starting another.");

  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    week,
    day,
    date: now.toISOString().slice(0, 10),
    startedAt: now.toISOString(),
    exercises: plan.exercises.map((entry) => ({
      exerciseId: entry.exerciseId,
      prescribedSets: entry.sets,
      performedSets: entry.sets.map((set) => ({
        setNumber: set.setNumber,
        completed: false
      }))
    }))
  };
  return {
    ...state,
    program: { ...state.program, currentWeek: week, currentDay: day, completed: false, activeSessionId: session.id },
    workoutSessions: [...state.workoutSessions, session]
  };
}

export function updateSet(
  state: AppState,
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  changes: Partial<Omit<PerformedSet, "setNumber">>
): AppState {
  return {
    ...state,
    workoutSessions: state.workoutSessions.map((session) => session.id !== sessionId ? session : {
      ...session,
      exercises: session.exercises.map((item) => item.exerciseId !== exerciseId ? item : {
        ...item,
        performedSets: item.performedSets.map((set) => set.setNumber === setNumber ? { ...set, ...changes } : set)
      })
    })
  };
}

export function updateSession(
  state: AppState,
  sessionId: string,
  changes: Partial<WorkoutSession>
): AppState {
  return {
    ...state,
    workoutSessions: state.workoutSessions.map((session) =>
      session.id === sessionId ? { ...session, ...changes } : session
    )
  };
}

export function completeWorkout(state: AppState, sessionId: string, now = new Date()): AppState {
  const session = state.workoutSessions.find((entry) => entry.id === sessionId);
  if (!session) throw new Error("Workout session not found.");
  const start = new Date(session.startedAt).getTime();
  const durationSeconds = Math.max(0, Math.floor((now.getTime() - start) / 1000));
  const finishedProgram = session.week === 12 && session.day === 5;
  const nextDay = finishedProgram ? 5 : session.day === 5 ? 1 : session.day + 1;
  const nextWeek = finishedProgram ? 12 : session.day === 5 ? Math.min(12, session.week + 1) : session.week;
  return {
    ...state,
    program: {
      ...state.program,
      currentWeek: nextWeek,
      currentDay: nextDay,
      completed: finishedProgram,
      activeSessionId: undefined
    },
    workoutSessions: state.workoutSessions.map((entry) => entry.id === sessionId
      ? { ...entry, completedAt: now.toISOString(), durationSeconds }
      : entry)
  };
}

export function getPreviousPerformance(
  sessions: WorkoutSession[],
  exerciseId: string,
  beforeSessionId?: string
): WorkoutSession["exercises"][number]["performedSets"] | undefined {
  const before = beforeSessionId ? sessions.find((item) => item.id === beforeSessionId) : undefined;
  return [...sessions]
    .filter((session) => session.id !== beforeSessionId && session.completedAt &&
      (!before || session.startedAt < before.startedAt) &&
      session.exercises.some((exercise) => exercise.exerciseId === exerciseId &&
        exercise.performedSets.some((set) => set.completed)))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
    ?.exercises.find((exercise) => exercise.exerciseId === exerciseId)?.performedSets;
}

export function countCompletedSets(session: WorkoutSession): number {
  return session.exercises.reduce((total, item) =>
    total + item.performedSets.filter((set) => set.completed).length, 0);
}

export function countPrescribedSets(session: WorkoutSession): number {
  return session.exercises.reduce((total, item) => total + item.prescribedSets.length, 0);
}
