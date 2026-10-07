import { describe, expect, it } from "vitest";
import { addRestTime, formatRestTime, skipRestTimer, startRestTimer, tickRestTimer, toggleRestTimer } from "./timer";

describe("prescribed rest timer", () => {
  it.each([60, 90, 120, 180])("starts the exact %i-second rest", (seconds) => {
    expect(startRestTimer(seconds)).toEqual({ remainingSeconds: seconds, paused: false });
  });

  it("pauses, resumes, extends, and skips", () => {
    const running = startRestTimer(90);
    const paused = toggleRestTimer(running);
    expect(tickRestTimer(paused).remainingSeconds).toBe(90);
    const resumed = toggleRestTimer(paused);
    expect(tickRestTimer(resumed).remainingSeconds).toBe(89);
    expect(addRestTime(resumed, 30).remainingSeconds).toBe(120);
    expect(skipRestTimer()).toBeNull();
  });

  it("formats and clamps the countdown", () => {
    expect(formatRestTime(60)).toBe("01:00");
    expect(formatRestTime(0)).toBe("00:00");
    expect(formatRestTime(-4)).toBe("00:00");
  });
});
