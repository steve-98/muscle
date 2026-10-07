export interface RestTimerState {
  remainingSeconds: number;
  paused: boolean;
}

export function startRestTimer(seconds: number): RestTimerState {
  if (!Number.isInteger(seconds) || seconds <= 0) {
    throw new Error("Rest duration must be a positive whole number of seconds.");
  }
  return { remainingSeconds: seconds, paused: false };
}

export function tickRestTimer(timer: RestTimerState): RestTimerState {
  return timer.paused ? timer : { ...timer, remainingSeconds: Math.max(0, timer.remainingSeconds - 1) };
}

export function toggleRestTimer(timer: RestTimerState): RestTimerState {
  return { ...timer, paused: !timer.paused };
}

export function addRestTime(timer: RestTimerState, seconds = 30): RestTimerState {
  if (!Number.isInteger(seconds) || seconds <= 0) {
    throw new Error("Added rest time must be a positive whole number of seconds.");
  }
  return { ...timer, remainingSeconds: timer.remainingSeconds + seconds };
}

export function skipRestTimer(): null {
  return null;
}

export function formatRestTime(totalSeconds: number): string {
  const seconds = Math.max(0, totalSeconds);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
