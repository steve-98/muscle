export interface SetPrescription {
  setNumber: number;
  targetReps: number;
  restSeconds: number;
}

export interface ProgramExercise {
  exerciseId: string;
  sourceName: string;
  sets: SetPrescription[];
}

export interface ProgramDay {
  dayNumber: number;
  exercises: ProgramExercise[];
}

export interface ProgramWeek {
  weekNumber: number;
  days: ProgramDay[];
}

export interface PerformedSet {
  setNumber: number;
  weight?: number;
  unit?: "kg" | "lb";
  reps?: number;
  completed: boolean;
  rpe?: number;
  rir?: number;
  notes?: string;
}

export interface LoggedExercise {
  exerciseId: string;
  prescribedSets: SetPrescription[];
  performedSets: PerformedSet[];
  exerciseNotes?: string;
}

export interface WorkoutSession {
  id: string;
  week: number;
  day: number;
  date: string;
  startedAt: string;
  completedAt?: string;
  exercises: LoggedExercise[];
  workoutNotes?: string;
  durationSeconds?: number;
  skipped?: boolean;
}

export interface BodyMetric {
  id: string;
  date: string;
  name: string;
  value: number;
  unit: string;
}

export interface AppState {
  schemaVersion: number;
  settings: {
    unit: "kg" | "lb";
    defaultRestTimerBehavior: "auto" | "manual";
    theme: "system" | "light" | "dark";
    vibration: boolean;
    sound: boolean;
  };
  program: {
    currentWeek: number;
    currentDay: number;
    startDate?: string;
    activeSessionId?: string;
    completed?: boolean;
  };
  workoutSessions: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  weekNotes: Record<number, string>;
  lastUpdated: string;
}
