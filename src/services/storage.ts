import type { AppState, BodyMetric, WorkoutSession } from "../types";

export const STORAGE_KEY = "muscle-foundation-app:v1";
export const SCHEMA_VERSION = 1;

export function createInitialState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      unit: "kg",
      defaultRestTimerBehavior: "auto",
      theme: "dark",
      vibration: true,
      sound: false
    },
    program: { currentWeek: 1, currentDay: 1, completed: false },
    workoutSessions: [],
    bodyMetrics: [],
    weekNotes: {},
    lastUpdated: new Date().toISOString()
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrescription(value: unknown): boolean {
  return isObject(value) && Number.isInteger(value.setNumber) && Number(value.setNumber) > 0 &&
    Number.isInteger(value.targetReps) && Number(value.targetReps) >= 0 &&
    Number.isInteger(value.restSeconds) && Number(value.restSeconds) >= 0;
}

function isPerformedSet(value: unknown): boolean {
  if (!isObject(value) || !Number.isInteger(value.setNumber) || Number(value.setNumber) < 1 ||
    typeof value.completed !== "boolean") return false;
  if (value.weight !== undefined && (!Number.isFinite(value.weight) || Number(value.weight) < 0)) return false;
  if (value.reps !== undefined && (!Number.isInteger(value.reps) || Number(value.reps) < 0)) return false;
  if (value.rpe !== undefined && (!Number.isFinite(value.rpe) || Number(value.rpe) < 1 || Number(value.rpe) > 10)) return false;
  if (value.rir !== undefined && (!Number.isInteger(value.rir) || Number(value.rir) < 0)) return false;
  if (value.unit !== undefined && value.unit !== "kg" && value.unit !== "lb") return false;
  return value.notes === undefined || typeof value.notes === "string";
}

function isSession(value: unknown): value is WorkoutSession {
  if (!isObject(value)) return false;
  const session = value as Partial<WorkoutSession>;
  return typeof session.id === "string" && session.id.length > 0 &&
    Number.isInteger(session.week) && session.week! >= 1 && session.week! <= 12 &&
    Number.isInteger(session.day) && session.day! >= 1 && session.day! <= 5 &&
    typeof session.date === "string" && typeof session.startedAt === "string" &&
    (session.completedAt === undefined || typeof session.completedAt === "string") &&
    (session.workoutNotes === undefined || typeof session.workoutNotes === "string") &&
    (session.skipped === undefined || typeof session.skipped === "boolean") &&
    (session.durationSeconds === undefined || (Number.isInteger(session.durationSeconds) && session.durationSeconds >= 0)) &&
    Array.isArray(session.exercises) && session.exercises.every((exercise) =>
      isObject(exercise) && typeof exercise.exerciseId === "string" &&
      Array.isArray(exercise.prescribedSets) && exercise.prescribedSets.every(isPrescription) &&
      Array.isArray(exercise.performedSets) && exercise.performedSets.every(isPerformedSet) &&
      (exercise.exerciseNotes === undefined || typeof exercise.exerciseNotes === "string")
    );
}

function isMetric(value: unknown): value is BodyMetric {
  if (!value || typeof value !== "object") return false;
  const metric = value as Partial<BodyMetric>;
  return typeof metric.id === "string" && typeof metric.date === "string" &&
    typeof metric.name === "string" && Number.isFinite(metric.value) && typeof metric.unit === "string";
}

export function migrateState(value: unknown): AppState {
  const initial = createInitialState();
  if (!value || typeof value !== "object") return initial;
  const data = value as Partial<AppState>;
  if (data.schemaVersion !== undefined && data.schemaVersion > SCHEMA_VERSION) {
    throw new Error("This backup was created by a newer version of Muscle Foundation.");
  }
  if (data.schemaVersion !== undefined && data.schemaVersion < 1) {
    throw new Error("This backup uses an unsupported data format.");
  }
  const validSettings = data.settings && typeof data.settings === "object" ? data.settings : initial.settings;
  const validProgram = data.program && typeof data.program === "object" ? data.program : initial.program;
  const currentWeek = Number.isInteger(validProgram.currentWeek) ? Math.min(12, Math.max(1, validProgram.currentWeek)) : 1;
  const currentDay = Number.isInteger(validProgram.currentDay) ? Math.min(5, Math.max(1, validProgram.currentDay)) : 1;
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      unit: validSettings.unit === "lb" ? "lb" : "kg",
      defaultRestTimerBehavior: validSettings.defaultRestTimerBehavior === "manual" ? "manual" : "auto",
      theme: validSettings.theme === "light" || validSettings.theme === "system" ? validSettings.theme : "dark",
      vibration: typeof validSettings.vibration === "boolean" ? validSettings.vibration : true,
      sound: typeof validSettings.sound === "boolean" ? validSettings.sound : false
    },
    program: {
      currentWeek,
      currentDay,
      completed: validProgram.completed === true,
      ...(typeof validProgram.startDate === "string" ? { startDate: validProgram.startDate } : {}),
      ...(typeof validProgram.activeSessionId === "string" ? { activeSessionId: validProgram.activeSessionId } : {})
    },
    workoutSessions: Array.isArray(data.workoutSessions) ? data.workoutSessions.filter(isSession) : [],
    bodyMetrics: Array.isArray(data.bodyMetrics) ? data.bodyMetrics.filter(isMetric) : [],
    weekNotes: data.weekNotes && typeof data.weekNotes === "object" ? data.weekNotes : {},
    lastUpdated: typeof data.lastUpdated === "string" ? data.lastUpdated : new Date().toISOString()
  };
}

export function loadState(): AppState {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return createInitialState();
    return migrateState(JSON.parse(serialized) as unknown);
  } catch (error) {
    console.error("Unable to load saved workout data.", error);
    return createInitialState();
  }
}

export function saveState(state: AppState): void {
  const next = { ...state, lastUpdated: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error("Unable to save workout data.", error);
    throw new Error("Your changes could not be saved. Check available device storage.");
  }
}

export function exportData(state: AppState): string {
  return JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }, null, 2);
}

export function importData(serialized: string, currentState: AppState): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (!isObject(parsed) || typeof parsed.schemaVersion !== "number") {
    throw new Error("This file is not a Muscle Foundation backup.");
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    throw new Error("This backup was created by a newer version of Muscle Foundation.");
  }
  if (parsed.schemaVersion < 1) {
    throw new Error("This backup uses an unsupported data format.");
  }
  const settings = parsed.settings;
  const program = parsed.program;
  if (!Array.isArray(parsed.workoutSessions) || !parsed.workoutSessions.every(isSession) ||
    !Array.isArray(parsed.bodyMetrics) || !parsed.bodyMetrics.every(isMetric) ||
    !isObject(settings) ||
    (settings.unit !== "kg" && settings.unit !== "lb") ||
    (settings.defaultRestTimerBehavior !== "auto" && settings.defaultRestTimerBehavior !== "manual") ||
    (settings.theme !== "system" && settings.theme !== "light" && settings.theme !== "dark") ||
    typeof settings.vibration !== "boolean" || typeof settings.sound !== "boolean" ||
    !isObject(program) ||
    !Number.isInteger(program.currentWeek) || Number(program.currentWeek) < 1 || Number(program.currentWeek) > 12 ||
    !Number.isInteger(program.currentDay) || Number(program.currentDay) < 1 || Number(program.currentDay) > 5 ||
    (program.completed !== undefined && typeof program.completed !== "boolean") ||
    (program.startDate !== undefined && typeof program.startDate !== "string") ||
    (program.activeSessionId !== undefined && typeof program.activeSessionId !== "string") ||
    !isObject(parsed.weekNotes) ||
    Object.values(parsed.weekNotes).some((note) => typeof note !== "string")) {
    throw new Error("This backup contains invalid or incomplete workout data.");
  }
  const imported = migrateState(parsed);
  const sessions = new Map(currentState.workoutSessions.map((item) => [item.id, item]));
  imported.workoutSessions.forEach((item) => sessions.set(item.id, item));
  const metrics = new Map(currentState.bodyMetrics.map((item) => [item.id, item]));
  imported.bodyMetrics.forEach((item) => metrics.set(item.id, item));
  return {
    ...imported,
    workoutSessions: [...sessions.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    bodyMetrics: [...metrics.values()].sort((a, b) => a.date.localeCompare(b.date))
  };
}

export function resetState(): AppState {
  const initial = createInitialState();
  saveState(initial);
  return initial;
}
