import { useEffect, useMemo, useState } from "react";
import { EXERCISES, searchExercises } from "./data/exercises";
import { IMAGE_SOURCE, imageUrls } from "./data/exerciseImages";
import { getWorkout, PROGRAM } from "./data/program";
import { exportData, importData, loadState, resetState, saveState } from "./services/storage";
import {
  completeWorkout, countCompletedSets, countPrescribedSets, getPreviousPerformance,
  startWorkout, updateSession, updateSet
} from "./services/workoutEngine";
import { addRestTime, formatRestTime, skipRestTimer, startRestTimer, tickRestTimer, toggleRestTimer } from "./services/timer";
import type { RestTimerState } from "./services/timer";
import type { AppState, WorkoutSession } from "./types";

type Section = "Today" | "Program" | "Exercises" | "History" | "Progress" | "Settings";
const navigation: Array<{ label: Section; icon: string }> = [
  { label: "Today", icon: "⌂" }, { label: "Program", icon: "▦" }, { label: "Exercises", icon: "✳" },
  { label: "History", icon: "↺" }, { label: "Progress", icon: "⌁" }
];

const todayString = () => new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
const formatDuration = (seconds?: number) => {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};
const formatWeight = (weight: number | undefined, unit: string) => weight === undefined ? "—" : `${weight} ${unit}`;

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [section, setSection] = useState<Section>("Today");
  const [viewingWorkout, setViewingWorkout] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(state.program.currentWeek);
  const [selectedDay, setSelectedDay] = useState(state.program.currentDay);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [usedThisWeek, setUsedThisWeek] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState("All muscles");
  const [equipmentFilter, setEquipmentFilter] = useState("All equipment");
  const [selectedExercise, setSelectedExercise] = useState<string>();
  const [expandedSession, setExpandedSession] = useState<string>();
  const [timer, setTimer] = useState<RestTimerState | null>(null);
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> }>();
  const [notice, setNotice] = useState("");
  const activeSession = state.workoutSessions.find((item) => item.id === state.program.activeSessionId && !item.completedAt && !item.skipped);

  useEffect(() => {
    try {
      saveState(state);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save changes.");
    }
  }, [state]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = () => {
      document.documentElement.dataset.theme = state.settings.theme === "system"
        ? (media.matches ? "light" : "dark")
        : state.settings.theme;
    };
    applyTheme();
    if (state.settings.theme === "system") {
      media.addEventListener("change", applyTheme);
      return () => media.removeEventListener("change", applyTheme);
    }
  }, [state.settings.theme]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!timer || timer.paused) return;
    if (timer.remainingSeconds <= 0) {
      setTimer(null);
      if (state.settings.vibration && "vibrate" in navigator) navigator.vibrate([180, 80, 180]);
      if (state.settings.sound) {
        try {
          const audio = new AudioContext();
          const oscillator = audio.createOscillator();
          oscillator.connect(audio.destination);
          oscillator.frequency.value = 660;
          oscillator.start();
          oscillator.stop(audio.currentTime + 0.16);
        } catch (error) {
          console.warn("Timer sound is unavailable.", error);
        }
      }
      setNotice("Rest complete. Ready for your next set.");
      return;
    }
    const timeout = window.setTimeout(() => setTimer((current) => current ? tickRestTimer(current) : null), 1000);
    return () => window.clearTimeout(timeout);
  }, [timer, state.settings.sound, state.settings.vibration]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const patchSettings = (settings: Partial<AppState["settings"]>) =>
    setState((current) => ({ ...current, settings: { ...current.settings, ...settings } }));

  const launchWorkout = (week = state.program.currentWeek, day = state.program.currentDay) => {
    try {
      const next = startWorkout(state, week, day);
      setState(next);
      setSelectedWeek(week);
      setSelectedDay(day);
      setSection("Today");
      setViewingWorkout(true);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to start this workout.");
    }
  };

  const skipWorkout = (week: number, day: number) => {
    if (!window.confirm(`Mark Week ${week}, Day ${day} as skipped? The source prescription will remain unchanged.`)) return;
    const now = new Date();
    const skippedSession: WorkoutSession = {
      id: crypto.randomUUID(), week, day, date: now.toISOString().slice(0, 10),
      startedAt: now.toISOString(), exercises: [], skipped: true
    };
    setState((current) => {
      const isCurrentDay = current.program.currentWeek === week && current.program.currentDay === day;
      return {
        ...current,
        workoutSessions: [...current.workoutSessions, skippedSession],
        ...(isCurrentDay ? { program: { ...current.program, currentDay: day === 5 ? 1 : day + 1, currentWeek: day === 5 ? Math.min(12, week + 1) : week } } : {})
      };
    });
    setNotice(`Week ${week} · Day ${day} marked as skipped.`);
  };

  const finishWorkout = (session: WorkoutSession) => {
    const complete = window.confirm("Save and finish this workout?");
    if (!complete) return;
    setState((current) => completeWorkout(current, session.id));
    setTimer(null);
    setViewingWorkout(false);
    setNotice(`Week ${session.week} · Day ${session.day} saved. Great work.`);
  };

  const exportBackup = () => {
    const blob = new Blob([exportData(state)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `muscle-foundation-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice("Backup exported to this device.");
  };

  const chooseBackup = async (file?: File) => {
    if (!file) return;
    try {
      const imported = importData(await file.text(), state);
      if (!window.confirm("Import this backup and merge its sessions with your current data?")) return;
      setState(imported);
      setNotice("Backup imported and merged.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "This backup could not be imported.");
    }
  };

  const addBodyMetric = (name: string, value: number) => {
    if (!Number.isFinite(value) || value < 0) {
      setNotice("Enter a valid non-negative measurement.");
      return;
    }
    setState((current) => ({
      ...current,
      bodyMetrics: [...current.bodyMetrics, {
        id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), name, value,
        unit: name === "Bodyweight" ? current.settings.unit : "cm"
      }]
    }));
  };

  const renderSection = () => {
    if (activeSession && viewingWorkout) {
      return <WorkoutView
        key={activeSession.id}
        session={activeSession}
        state={state}
        setState={setState}
        timer={timer}
        setTimer={setTimer}
        onFinish={finishWorkout}
        onExit={() => { setViewingWorkout(false); setSection("Today"); }}
      />;
    }
    switch (section) {
      case "Today":
        return <TodayView state={state} setSection={setSection} onStart={launchWorkout} setSelectedWeek={setSelectedWeek} setSelectedDay={setSelectedDay} activeSession={activeSession} />;
      case "Program":
        return <ProgramView
          state={state}
          setState={setState}
          selectedWeek={selectedWeek}
          selectedDay={selectedDay}
          setSelectedWeek={setSelectedWeek}
          setSelectedDay={setSelectedDay}
          onStart={launchWorkout}
          onSkip={skipWorkout}
        />;
      case "Exercises":
        return <ExercisesView
          state={state}
          query={exerciseQuery}
          setQuery={setExerciseQuery}
          usedThisWeek={usedThisWeek}
          setUsedThisWeek={setUsedThisWeek}
          muscleFilter={muscleFilter}
          setMuscleFilter={setMuscleFilter}
          equipmentFilter={equipmentFilter}
          setEquipmentFilter={setEquipmentFilter}
          selectedExercise={selectedExercise}
          setSelectedExercise={setSelectedExercise}
        />;
      case "History":
        return <HistoryView
          state={state}
          setState={setState}
          expandedSession={expandedSession}
          setExpandedSession={setExpandedSession}
        />;
      case "Progress":
        return <ProgressView state={state} addBodyMetric={addBodyMetric} />;
      case "Settings":
        return <SettingsView
          state={state}
          patchSettings={patchSettings}
          onExport={exportBackup}
          onImport={chooseBackup}
          onReset={() => {
            if (!window.confirm("Delete all workout data stored on this device? This cannot be undone.")) return;
            if (!window.confirm("Confirm permanent deletion of all local data.")) return;
            setState(resetState());
            setSection("Today");
            setViewingWorkout(false);
            setNotice("Local app data deleted.");
          }}
          onSetPosition={(week, day) => setState((current) => ({
            ...current,
            program: { ...current.program, currentWeek: week, currentDay: day, completed: false }
          }))}
          onInstall={async () => {
            if (installPrompt?.prompt) {
              await installPrompt.prompt();
              setInstallPrompt(undefined);
            } else {
              setNotice("On iPhone or iPad, use Share → Add to Home Screen.");
            }
          }}
          canInstall={Boolean(installPrompt)}
        />;
    }
  };

  const miniTimer = timer !== null && !viewingWorkout;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-mark" aria-label="Go to Today" onClick={() => setSection("Today")}>MF</button>
        <div className="brand-copy"><span className="eyebrow">TRAINING LOG</span><strong>Muscle Foundation</strong></div>
        <button className="icon-button settings-shortcut" aria-label="Settings" onClick={() => setSection("Settings")}>⚙</button>
      </header>
      {notice && <div className="toast" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
      <main className="main-content">{renderSection()}</main>
      {miniTimer && (
        <button className="mini-timer" onClick={() => setTimer((current) => current ? toggleRestTimer(current) : null)} aria-label="Pause or resume rest timer">
          <span className="pulse-dot" /> REST {timer.paused ? "PAUSED" : "RUNNING"} · {formatRestTime(timer.remainingSeconds)}
          <span>{timer.paused ? "RESUME" : "PAUSE"}</span>
        </button>
      )}
      {!viewingWorkout && (
        <nav className="bottom-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button key={item.label} className={section === item.label ? "nav-item active" : "nav-item"}
              aria-current={section === item.label ? "page" : undefined} onClick={() => setSection(item.label)}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function PageHeading({ kicker, title, action }: { kicker: string; title: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{kicker}</span><h1>{title}</h1></div>{action}</div>;
}

function TodayView({
  state, setSection, onStart, setSelectedWeek, setSelectedDay, activeSession
}: {
  state: AppState;
  setSection: (section: Section) => void;
  onStart: (week?: number, day?: number) => void;
  setSelectedWeek: (week: number) => void;
  setSelectedDay: (day: number) => void;
  activeSession?: WorkoutSession;
}) {
  const week = state.program.currentWeek;
  const day = state.program.currentDay;
  const today = getWorkout(week, day)!;
  const exercisesCount = today.exercises.length;
  const setCount = today.exercises.reduce((count, item) => count + item.sets.length, 0);
  const previousSession = [...state.workoutSessions].filter((session) => session.completedAt && !session.skipped)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const completedSets = activeSession ? countCompletedSets(activeSession) : 0;
  const plannedSets = activeSession ? countPrescribedSets(activeSession) : setCount;
  const setsRemaining = Math.max(0, plannedSets - completedSets);
  const remainingRest = activeSession
    ? activeSession.exercises.reduce((sum, item) => sum + item.prescribedSets
      .filter((set) => !item.performedSets.find((logged) => logged.setNumber === set.setNumber)?.completed)
      .reduce((rest, set) => rest + set.restSeconds, 0), 0)
    : today.exercises.reduce((sum, item) => sum + item.sets.reduce((rest, set) => rest + set.restSeconds, 0), 0);
  const estimatedMinutes = Math.ceil((remainingRest + setsRemaining * 45) / 60);
  const currentBodyweight = state.bodyMetrics.filter((metric) => metric.name === "Bodyweight")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const totalSetsDone = previousSession ? countCompletedSets(previousSession) : 0;

  return <div className="view-stack">
    <PageHeading kicker={todayString()} title="Ready when you are." />
    <section className="today-hero panel">
      <div className="hero-topline"><span className="phase-label">12-WEEK FOUNDATION</span><span className="live-label"><i /> {state.program.completed ? "PROGRAM COMPLETE" : "PROGRAM ACTIVE"}</span></div>
      <div className="week-day"><div><span>WEEK</span><strong>{String(week).padStart(2, "0")}</strong></div><span className="week-divider">/</span><div><span>DAY</span><strong>{String(day).padStart(2, "0")}</strong></div></div>
      <div className="hero-rule" />
      <div className="workout-summary"><div><span className="eyebrow">TODAY'S SESSION</span><h2>{day === 1 || day === 5 ? "Lower body · Chest" : day === 3 ? "Shoulders · Chest · Hinge" : "Upper body · Accessories"}</h2></div>
        <span className="exercise-count">{exercisesCount} EXERCISES</span></div>
      <div className="workout-exercise-preview">
        {today.exercises.slice(0, 4).map((item) => <span key={item.exerciseId}>{item.sourceName}</span>)}
        {exercisesCount > 4 && <span className="more-preview">+ {exercisesCount - 4} more</span>}
      </div>
      <div className="today-stats">
        <div><strong>{completedSets}/{plannedSets}</strong><span>SETS THIS SESSION</span></div>
        <div><strong>{exercisesCount}</strong><span>EXERCISES</span></div>
        <div><strong>~{estimatedMinutes}m</strong><span>EST. REMAINING</span></div>
        <div><strong>{currentBodyweight ? formatWeight(currentBodyweight.value, currentBodyweight.unit) : "—"}</strong><span>BODYWEIGHT</span></div>
      </div>
      <button className="primary-button start-button" onClick={() => state.program.completed ? setSection("Program") : onStart(activeSession?.week ?? week, activeSession?.day ?? day)}>
        <span>{state.program.completed ? "REVIEW PROGRAM" : activeSession ? `CONTINUE WEEK ${activeSession.week} · DAY ${activeSession.day}` : "START WORKOUT"}</span><b aria-hidden="true">↗</b>
      </button>
      <p className="hero-footnote">Your program stays true to the source. Log your work; targets never change.</p>
    </section>
    <div className="two-column">
      <section className="panel compact-panel">
        <div className="section-title"><h2>Last session</h2><button className="text-button" onClick={() => setSection("History")}>History ↗</button></div>
        {previousSession ? <div className="last-session">
          <span className="accent-bar" />
          <div><strong>Week {previousSession.week} · Day {previousSession.day}</strong>
            <span>{new Date(previousSession.date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {totalSetsDone} sets logged</span></div>
          <b>{formatDuration(previousSession.durationSeconds)}</b>
        </div> : <EmptyMessage text="Your first session is waiting." />}
      </section>
      <section className="panel compact-panel">
        <div className="section-title"><h2>Program path</h2><button className="text-button" onClick={() => setSection("Program")}>View all ↗</button></div>
        <div className="week-progress">{PROGRAM.weeks.map((item) => {
          const done = state.workoutSessions.some((session) => session.week === item.weekNumber && session.completedAt && !session.skipped);
          return <button key={item.weekNumber} title={`Week ${item.weekNumber}`} aria-label={`View week ${item.weekNumber}`}
            className={`${item.weekNumber === week ? "current " : ""}${done ? "complete" : ""}`}
            onClick={() => { setSelectedWeek(item.weekNumber); setSelectedDay(1); setSection("Program"); }}>{item.weekNumber}</button>;
        })}</div>
        <p className="muted small-copy">{Math.max(0, 12 - week)} weeks after this one</p>
      </section>
    </div>
    <div className="privacy-note"><span aria-hidden="true">◈</span><p><strong>Private by design.</strong> Your training data stays on this device. Export a backup in Settings.</p></div>
  </div>;
}

function ProgramView({
  state, setState, selectedWeek, selectedDay, setSelectedWeek, setSelectedDay, onStart, onSkip
}: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; selectedWeek: number; selectedDay: number;
  setSelectedWeek: (week: number) => void; setSelectedDay: (day: number) => void;
  onStart: (week?: number, day?: number) => void; onSkip: (week: number, day: number) => void;
}) {
  const currentDay = getWorkout(selectedWeek, selectedDay);
  return <div className="view-stack">
    <PageHeading kicker="THE FULL PRESCRIPTION" title="Program overview" action={<span className="tag">12 WEEKS</span>} />
    <div className="program-overview panel">
      <div className="program-weeks" role="tablist" aria-label="Program week">
        {PROGRAM.weeks.map((week) => {
          const completed = state.workoutSessions.filter((session) => session.week === week.weekNumber && session.completedAt && !session.skipped).length;
          return <button key={week.weekNumber} role="tab" aria-selected={selectedWeek === week.weekNumber}
            className={`week-tab ${selectedWeek === week.weekNumber ? "selected" : ""} ${completed >= 5 ? "week-done" : ""}`}
            onClick={() => setSelectedWeek(week.weekNumber)}>
            <span>WEEK</span><strong>{String(week.weekNumber).padStart(2, "0")}</strong><i>{completed}/5</i>
          </button>;
        })}
      </div>
      <div className="phase-note"><span className="eyebrow">TRAINING PHASE</span><strong>{selectedWeek <= 4 ? "Foundation · Weeks 1–4" : selectedWeek <= 8 ? "Build · Weeks 5–8" : "Strength · Weeks 9–12"}</strong><span>Five training days · Prescription preserved as published</span></div>
    </div>
    <div className="day-tabs" role="tablist" aria-label={`Week ${selectedWeek} training days`}>
      {Array.from({ length: 5 }, (_, index) => index + 1).map((dayNumber) => {
        const done = state.workoutSessions.some((session) => session.week === selectedWeek && session.day === dayNumber && session.completedAt && !session.skipped);
        return <button role="tab" aria-selected={selectedDay === dayNumber} key={dayNumber}
          className={`${selectedDay === dayNumber ? "selected" : ""} ${done ? "done" : ""}`}
          onClick={() => setSelectedDay(dayNumber)}><span>DAY</span><strong>{dayNumber}</strong>{done && <i>✓</i>}</button>;
      })}
    </div>
    {currentDay && <section className="day-detail panel">
      <div className="section-title"><div><span className="eyebrow">WEEK {String(selectedWeek).padStart(2, "0")} · DAY {selectedDay}</span>
        <h2>{selectedDay === 1 || selectedDay === 5 ? "Main lifts" : selectedDay === 3 ? "Press & pull" : "Accessory work"}</h2></div>
        <button className="small-button" onClick={() => onStart(selectedWeek, selectedDay)}>START THIS DAY ↗</button></div>
      <div className="prescription-list">{currentDay.exercises.map((item, index) => {
        const completed = state.workoutSessions.some((session) => session.week === selectedWeek && session.day === selectedDay &&
          session.completedAt && session.exercises.find((exercise) => exercise.exerciseId === item.exerciseId)?.performedSets.some((set) => set.completed));
        return <div className="prescription-row" key={`${item.exerciseId}-${index}`}>
          <span className="row-number">{String(index + 1).padStart(2, "0")}</span>
          <div className="row-name"><strong>{item.sourceName}</strong><span>{formatPrescription(item.sets)}</span></div>
          {completed && <span className="status-check" aria-label="Completed">✓</span>}
        </div>;
      })}</div>
      <label className="week-notes"><span>WEEK {selectedWeek} NOTES</span><textarea
        value={state.weekNotes[selectedWeek] ?? ""} maxLength={2000}
        onChange={(event) => setState((current) => ({ ...current, weekNotes: { ...current.weekNotes, [selectedWeek]: event.target.value } }))}
        placeholder="Your notes for this training week…" /></label>
      <button className="skip-button" onClick={() => onSkip(selectedWeek, selectedDay)}>MARK DAY AS SKIPPED</button>
      <p className="source-disclaimer">Prescribed sets, reps, and rest are from the program. Your logged performance is stored separately.</p>
    </section>}
  </div>;
}

function ExercisesView({
  state, query, setQuery, usedThisWeek, setUsedThisWeek, muscleFilter, setMuscleFilter, equipmentFilter, setEquipmentFilter, selectedExercise, setSelectedExercise
}: {
  state: AppState; query: string; setQuery: (value: string) => void; usedThisWeek: boolean; setUsedThisWeek: (value: boolean) => void;
  muscleFilter: string; setMuscleFilter: (value: string) => void;
  equipmentFilter: string; setEquipmentFilter: (value: string) => void; selectedExercise?: string; setSelectedExercise: (id?: string) => void;
}) {
  const muscles = ["All muscles", ...new Set(EXERCISES.map((exercise) => exercise.primary))].sort((a, b) => a === "All muscles" ? -1 : a.localeCompare(b));
  const equipment = ["All equipment", ...new Set(EXERCISES.map((exercise) => exercise.equipment.split(",")[0]))].sort((a, b) => a === "All equipment" ? -1 : a.localeCompare(b));
  const thisWeekIds = new Set(PROGRAM.weeks[state.program.currentWeek - 1]?.days.flatMap((day) => day.exercises.map((item) => item.exerciseId)) ?? []);
  const results = useMemo(() => searchExercises(query).filter((exercise) =>
    (muscleFilter === "All muscles" || exercise.primary === muscleFilter) &&
    (equipmentFilter === "All equipment" || exercise.equipment.startsWith(equipmentFilter)) &&
    (!usedThisWeek || thisWeekIds.has(exercise.id))
  ), [query, muscleFilter, equipmentFilter, usedThisWeek, state.program.currentWeek]);
  const selected = EXERCISES.find((exercise) => exercise.id === selectedExercise);
  const [previewId, setPreviewId] = useState<string>();
  const preview = EXERCISES.find((exercise) => exercise.id === previewId);
  return <div className="view-stack">
    <PageHeading kicker="MOVEMENT LIBRARY" title={selected ? selected.sourceName : "Exercise reference"}
      action={selected && <button className="text-button" onClick={() => setSelectedExercise(undefined)}>← All exercises</button>} />
    {selected ? <ExerciseDetail exercise={selected} state={state} /> : <>
      <div className="exercise-tools">
        <label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises or aliases…" aria-label="Search exercises" /></label>
        <label className="select-wrap"><span className="sr-only">Filter by muscle</span><select value={muscleFilter} onChange={(event) => setMuscleFilter(event.target.value)}>{muscles.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="select-wrap"><span className="sr-only">Filter by equipment</span><select value={equipmentFilter} onChange={(event) => setEquipmentFilter(event.target.value)}>{equipment.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <button className={`filter-chip ${usedThisWeek ? "active" : ""}`} aria-pressed={usedThisWeek} onClick={() => setUsedThisWeek(!usedThisWeek)}>USED THIS WEEK <span>{usedThisWeek ? "✓" : "+"}</span></button>
      <div className="results-count">{results.length} MOVEMENTS <span>· Alphabetical</span></div>
      <div className="exercise-grid">{results.map((exercise) => {
        const recent = getPreviousPerformance(state.workoutSessions, exercise.id);
        return <button className="exercise-card panel" key={exercise.id} onClick={() => setPreviewId(exercise.id)}>
          {exercise.image ? <img className="exercise-thumb" src={imageUrls(exercise.image)[0]} alt="" loading="lazy" /> : <ExerciseGlyph />}
          <div><strong>{exercise.sourceName}</strong>{exercise.alias && <span className="alias">Alias: {exercise.alias}</span>}
            <span className="exercise-meta">{exercise.primary} · {exercise.equipment}</span>
            {recent ? <span className="recent-chip">LAST LOGGED · {formatWeight(recent.find((set) => set.completed)?.weight, state.settings.unit)}</span> : <span className="no-history">NO HISTORY YET</span>}
          </div><span className="card-arrow">↗</span>
        </button>;
      })}</div>
      {results.length === 0 && <EmptyMessage text="No exercise matches those filters." />}
    </>}
    {preview && <ExercisePopup exercise={preview} onClose={() => setPreviewId(undefined)} onDetails={() => { setPreviewId(undefined); setSelectedExercise(preview.id); }} />}
  </div>;
}

function ExerciseImages({ exercise, large }: { exercise: (typeof EXERCISES)[number]; large?: boolean }) {
  const [step, setStep] = useState(0);
  if (!exercise.image) return <div className="exercise-illustration large"><ExerciseGlyph /><span className="glyph-caption">NO IMAGE AVAILABLE</span></div>;
  const urls = imageUrls(exercise.image);
  return <figure className={`exercise-photos ${large ? "large" : ""}`}>
    <button className="photo-frame" onClick={() => setStep(step === 0 ? 1 : 0)} aria-label={`Show ${step === 0 ? "end" : "start"} position`}>
      <img src={urls[step]} alt={`${exercise.sourceName}, ${step === 0 ? "start" : "end"} position`} />
      <span className="photo-tag">{step === 0 ? "START" : "END"} · TAP TO FLIP</span>
    </button>
    <figcaption>{exercise.image.similar ? `Similar movement: ${exercise.image.name}` : exercise.image.name}</figcaption>
  </figure>;
}

function ExercisePopup({ exercise, onClose, onDetails }: { exercise: (typeof EXERCISES)[number]; onClose: () => void; onDetails: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="popup-backdrop" onClick={onClose}>
    <div className="popup-card panel" role="dialog" aria-modal="true" aria-label={exercise.sourceName} onClick={(event) => event.stopPropagation()}>
      <div className="popup-head"><div><span className="eyebrow">{exercise.primary.toUpperCase()}</span><h2>{exercise.sourceName}</h2></div>
        <button className="text-button" onClick={onClose} aria-label="Close">✕</button></div>
      <ExerciseImages exercise={exercise} />
      <button className="primary-button" onClick={onDetails}>Full details &amp; history</button>
    </div>
  </div>;
}

function ExerciseDetail({ exercise, state }: { exercise: (typeof EXERCISES)[number]; state: AppState }) {
  const history = state.workoutSessions.flatMap((session) => session.exercises
    .filter((item) => item.exerciseId === exercise.id)
    .map((item) => ({ session, item })))
    .filter(({ session }) => session.completedAt)
    .sort((a, b) => b.session.startedAt.localeCompare(a.session.startedAt)).slice(0, 8);
  return <div className="detail-grid">
    <section className="panel exercise-detail-main"><ExerciseImages exercise={exercise} large />
      <span className="eyebrow">SOURCE NAME</span><h2>{exercise.sourceName}</h2>
      {exercise.alias && <p className="alias-note">Common alias: {exercise.alias} · Program spelling preserved</p>}
      <p className="detail-description">{exercise.description}</p>
      <div className="detail-facts"><div><span>PRIMARY</span><strong>{exercise.primary}</strong></div><div><span>SECONDARY</span><strong>{exercise.secondary}</strong></div><div><span>EQUIPMENT</span><strong>{exercise.equipment}</strong></div></div>
      <h3>Form reminders <span className="supplemental">(supplemental)</span></h3><ul className="cue-list">{exercise.cues.map((cue) => <li key={cue}>{cue}</li>)}</ul>
      <p className="image-attribution">Images: <a href={IMAGE_SOURCE.url} target="_blank" rel="noopener noreferrer">{IMAGE_SOURCE.name}</a> · {IMAGE_SOURCE.license}</p>
    </section>
    <section className="panel exercise-usage"><span className="eyebrow">PROGRAM APPEARANCES</span><h3>In your plan</h3><p className="usage-text">{exercise.usage}</p>
      <div className="section-title"><h3>Recent history</h3><span className="tag">{history.length} SESSIONS</span></div>
      {history.length ? history.map(({ session, item }) => <div className="history-performance" key={session.id}>
        <span>W{session.week} · D{session.day}</span><strong>{item.performedSets.filter((set) => set.completed).map((set) => `${formatWeight(set.weight, set.unit ?? state.settings.unit)} × ${set.reps ?? "—"}`).join("  /  ") || "No completed sets"}</strong>
      </div>) : <EmptyMessage text="No previous performance logged." />}
    </section>
  </div>;
}

function ExerciseGlyph() {
  return <span className="exercise-illustration" aria-hidden="true"><span className="dumbbell"><i /><b /><i /></span><span className="glyph-caption">MOVEMENT<br />REFERENCE</span></span>;
}

function HistoryView({
  state, setState, expandedSession, setExpandedSession
}: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; expandedSession?: string; setExpandedSession: (id?: string) => void;
}) {
  const sessions = [...state.workoutSessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const deleteSession = (session: WorkoutSession) => {
    if (!window.confirm(`Delete the Week ${session.week} Day ${session.day} session?`)) return;
    setState((current) => ({
      ...current,
      workoutSessions: current.workoutSessions.filter((item) => item.id !== session.id),
      program: current.program.activeSessionId === session.id ? { ...current.program, activeSessionId: undefined } : current.program
    }));
  };
  return <div className="view-stack">
    <PageHeading kicker="EVERY SESSION, ON RECORD" title="Workout history" action={<span className="tag">{sessions.filter((item) => item.completedAt).length} COMPLETED</span>} />
    {sessions.length ? <div className="history-list">{sessions.map((session) => {
      const doneSets = countCompletedSets(session);
      const totalSets = countPrescribedSets(session);
      const expanded = expandedSession === session.id;
      return <section className="panel history-card" key={session.id}>
        <button className="history-card-head" aria-expanded={expanded} onClick={() => setExpandedSession(expanded ? undefined : session.id)}>
          <span className="history-date"><strong>{new Date(session.date + "T12:00:00").toLocaleDateString(undefined, { day: "2-digit" })}</strong><i>{new Date(session.date + "T12:00:00").toLocaleDateString(undefined, { month: "short" }).toUpperCase()}</i></span>
          <span className="history-title"><strong>Week {session.week} · Day {session.day}</strong><span>{session.completedAt ? "Completed" : session.skipped ? "Skipped" : "In progress"} · {doneSets}/{totalSets} sets</span></span>
          <span className={session.completedAt ? "completed-pill" : "incomplete-pill"}>{session.completedAt ? "DONE" : session.skipped ? "SKIPPED" : "OPEN"}</span>
          <span className="card-arrow">{expanded ? "−" : "+"}</span>
        </button>
        {expanded && <div className="history-expanded">
          <div className="history-facts"><span>{new Date(session.startedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span><span>{formatDuration(session.durationSeconds)}</span><span>{doneSets} sets</span></div>
          {session.exercises.map((exercise) => <div className="logged-exercise" key={exercise.exerciseId}>
            <strong>{EXERCISES.find((item) => item.id === exercise.exerciseId)?.sourceName ?? exercise.exerciseId}</strong>
            <span>{exercise.performedSets.map((set, index) => <i className={set.completed ? "set-dot checked" : "set-dot"} key={set.setNumber} title={set.completed ? `Set ${index + 1} logged` : `Set ${index + 1} incomplete`}>
              {set.completed ? `${formatWeight(set.weight, set.unit ?? state.settings.unit)} × ${set.reps ?? "—"}${set.rpe === undefined ? "" : ` · RPE ${set.rpe}`}${set.rir === undefined ? "" : ` · RIR ${set.rir}`}` : `Set ${set.setNumber} · not done`}
            </i>)}</span>
          </div>)}
          <label className="notes-field"><span>SESSION NOTES</span><textarea value={session.workoutNotes ?? ""} maxLength={2000} onChange={(event) => setState((current) => updateSession(current, session.id, { workoutNotes: event.target.value }))} placeholder="Add a note about this session…" /></label>
          <div className="history-actions"><button className="danger-button" onClick={() => deleteSession(session)}>DELETE SESSION</button></div>
        </div>}
      </section>;
    })}</div> : <div className="panel empty-panel"><span className="empty-icon">↺</span><h2>No sessions yet</h2><p>Your completed workouts will show here. Start your first workout when you're ready.</p></div>}
  </div>;
}

function ProgressView({ state, addBodyMetric }: { state: AppState; addBodyMetric: (name: string, value: number) => void }) {
  const completed = state.workoutSessions.filter((session) => session.completedAt && !session.skipped);
  const completedSets = completed.reduce((total, session) => total + countCompletedSets(session), 0);
  const totalVolume = completed.flatMap((session) => session.exercises.flatMap((exercise) =>
    exercise.performedSets.filter((set) => set.completed && set.weight !== undefined && set.reps !== undefined)
      .map((set) => {
        const weight = set.weight ?? 0;
        const converted = set.unit && set.unit !== state.settings.unit
          ? state.settings.unit === "kg" ? weight / 2.20462 : weight * 2.20462
          : weight;
        return converted * (set.reps ?? 0);
      }))).reduce((sum, value) => sum + value, 0);
  const weekCounts = PROGRAM.weeks.map((week) => ({
    week: week.weekNumber,
    count: completed.filter((session) => session.week === week.weekNumber).length
  }));
  const metricEntries = state.bodyMetrics.filter((entry) => entry.name === "Bodyweight").sort((a, b) => a.date.localeCompare(b.date));
  const recentWeight = metricEntries.at(-1);
  return <div className="view-stack">
    <PageHeading kicker="CONSISTENCY OVER PERFECTION" title="Progress" />
    <div className="stats-grid">
      <StatCard value={`${completed.length}`} label="SESSIONS COMPLETED" detail="Out of 60 in the program" />
      <StatCard value={`${Math.min(100, Math.round(completed.length / 60 * 100))}%`} label="PROGRAM COMPLETE" detail={`Week ${state.program.currentWeek} · Day ${state.program.currentDay}`} />
      <StatCard value={completedSets.toLocaleString()} label="SETS LOGGED" detail="Completed sets across history" />
      <StatCard value={totalVolume ? `${Math.round(totalVolume).toLocaleString()} ${state.settings.unit}` : "—"} label="TOTAL VOLUME" detail="Only sets with weight and reps" />
    </div>
    <section className="panel progress-panel">
      <div className="section-title"><div><span className="eyebrow">WEEKLY CONSISTENCY</span><h2>Sessions completed</h2></div><span className="tag">5 PER WEEK</span></div>
      <div className="bar-chart" aria-label="Completed workouts by week">
        {weekCounts.map(({ week, count }) => <div className="bar-column" key={week}>
          <span className="bar-count">{count || ""}</span><div className="bar-track"><i style={{ height: `${Math.max(5, count / 5 * 100)}%` }} className={count === 5 ? "full" : ""} /></div><span className="bar-label">W{week}</span>
        </div>)}
      </div>
      <p className="chart-caption">No missed-day penalties. Continue at your own pace and keep the program sequence intact.</p>
    </section>
    <div className="two-column">
      <section className="panel compact-panel">
        <div className="section-title"><div><span className="eyebrow">BODY METRICS</span><h2>Bodyweight</h2></div><span className="tag">{recentWeight ? formatWeight(recentWeight.value, recentWeight.unit) : "OPTIONAL"}</span></div>
        <MetricForm unit={state.settings.unit} add={addBodyMetric} />
        {metricEntries.length > 1 ? <div className="metric-history">{metricEntries.slice(-6).reverse().map((metric) => <div key={metric.id}><span>{new Date(metric.date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><strong>{metric.value} {metric.unit}</strong></div>)}</div> : <EmptyMessage text="Record optional bodyweight to see a trend." />}
      </section>
      <section className="panel compact-panel"><span className="eyebrow">STRENGTH HISTORY</span><h2>Exercise trends</h2>
        {completed.length < 2 ? <EmptyMessage text="Log a few workouts to see exercise trends." /> : <div className="trend-list">{["Bench Press", "Squats", "Deadlifts"].map((name) => {
          const exercise = EXERCISES.find((item) => item.sourceName === name);
          const values = completed.flatMap((session) => session.exercises.filter((item) => item.exerciseId === exercise?.id)
            .flatMap((item) => item.performedSets.filter((set) => set.completed && set.weight !== undefined).map((set) => {
              const weight = set.weight ?? 0;
              if (!set.unit || set.unit === state.settings.unit) return weight;
              return state.settings.unit === "kg" ? weight / 2.20462 : weight * 2.20462;
            })));
          return <div key={name}><span>{name}</span><strong>{values.length ? `${Math.max(...values)} ${state.settings.unit} best logged` : "No weight entries yet"}</strong></div>;
        })}</div>}
      </section>
    </div>
  </div>;
}

function StatCard({ value, label, detail }: { value: string; label: string; detail: string }) {
  return <section className="panel stat-card"><span className="eyebrow">{label}</span><strong>{value}</strong><span>{detail}</span></section>;
}

function MetricForm({ unit, add }: { unit: string; add: (name: string, value: number) => void }) {
  const [value, setValue] = useState("");
  const [name, setName] = useState("Bodyweight");
  const [customName, setCustomName] = useState("");
  const metricUnit = name === "Bodyweight" ? unit : "cm";
  return <form className="metric-form" onSubmit={(event) => {
    event.preventDefault();
    const parsed = Number(value);
    if (value.trim() && Number.isFinite(parsed)) {
      add(name === "Other" ? customName.trim() : name, parsed);
      setValue("");
    }
  }}>
    <label><span className="sr-only">Measurement type</span><select value={name} onChange={(event) => setName(event.target.value)}>
      <option>Bodyweight</option><option>Waist</option><option>Chest</option><option>Arm</option><option>Thigh</option><option>Other</option>
    </select></label>
    {name === "Other" && <label><span className="sr-only">Custom measurement name</span><input value={customName} maxLength={40} onChange={(event) => setCustomName(event.target.value)} placeholder="Name" /></label>}
    <label><span className="sr-only">Bodyweight</span><input type="number" min="0" step="0.1" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Enter weight" /></label>
    <span className="metric-unit">{metricUnit}</span><button className="small-button" type="submit" disabled={name === "Other" && !customName.trim()}>ADD</button>
  </form>;
}

function SettingsView({
  state, patchSettings, onExport, onImport, onReset, onInstall, canInstall, onSetPosition
}: {
  state: AppState; patchSettings: (settings: Partial<AppState["settings"]>) => void;
  onExport: () => void; onImport: (file?: File) => void; onReset: () => void; onInstall: () => void; canInstall: boolean;
  onSetPosition: (week: number, day: number) => void;
}) {
  return <div className="view-stack">
    <PageHeading kicker="YOUR DEVICE · YOUR DATA" title="Settings" />
    <div className="settings-grid">
      <section className="panel settings-panel"><span className="eyebrow">PREFERENCES</span><h2>Training setup</h2>
        <SettingRow label="Weight unit" detail="Historical entries keep the unit used when recorded."><select value={state.settings.unit} onChange={(event) => patchSettings({ unit: event.target.value as "kg" | "lb" })}><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option></select></SettingRow>
        <SettingRow label="Appearance" detail="Choose a look or follow your device."><select value={state.settings.theme} onChange={(event) => patchSettings({ theme: event.target.value as AppState["settings"]["theme"] })}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></SettingRow>
        <SettingRow label="Rest timer" detail="Auto-start the prescribed rest after logging a set."><select value={state.settings.defaultRestTimerBehavior} onChange={(event) => patchSettings({ defaultRestTimerBehavior: event.target.value as "auto" | "manual" })}><option value="auto">Auto-start</option><option value="manual">Manual start</option></select></SettingRow>
        <SettingRow label="Vibration" detail="Vibrate when the rest timer finishes."><input type="checkbox" checked={state.settings.vibration} onChange={(event) => patchSettings({ vibration: event.target.checked })} /></SettingRow>
        <SettingRow label="Timer sound" detail="Play a short tone when rest is complete."><input type="checkbox" checked={state.settings.sound} onChange={(event) => patchSettings({ sound: event.target.checked })} /></SettingRow>
      </section>
      <section className="panel settings-panel"><span className="eyebrow">PROGRAM</span><h2>Program position</h2>
        <p className="settings-description">Your next workout is Week {state.program.currentWeek}, Day {state.program.currentDay}. Moving your position does not change any workout prescriptions.</p>
        <div className="program-override">
          <label>Week<select defaultValue={state.program.currentWeek} id="override-week">{PROGRAM.weeks.map((week) => <option value={week.weekNumber} key={week.weekNumber}>{week.weekNumber}</option>)}</select></label>
          <label>Day<select defaultValue={state.program.currentDay} id="override-day">{Array.from({ length: 5 }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}</option>)}</select></label>
          <button className="small-button" onClick={() => {
            const week = Number((document.getElementById("override-week") as HTMLSelectElement).value);
            const day = Number((document.getElementById("override-day") as HTMLSelectElement).value);
            if (window.confirm(`Set your next workout to Week ${week}, Day ${day}?`)) {
              onSetPosition(week, day);
            }
          }}>SAVE POSITION</button>
        </div>
        <button className="secondary-button install-button" onClick={onInstall}>{canInstall ? "INSTALL APP" : "INSTALLATION HELP"}</button>
      </section>
      <section className="panel settings-panel backup-panel"><span className="eyebrow">LOCAL BACKUP</span><h2>Protect your training log</h2>
        <p className="settings-description">Your data is stored only on this device. There is no account and no cloud backup. Export a copy somewhere safe.</p>
        <button className="primary-button" onClick={onExport}>EXPORT JSON BACKUP ↗</button>
        <label className="secondary-button file-button">IMPORT & MERGE BACKUP<input type="file" accept="application/json,.json" onChange={(event) => { void onImport(event.target.files?.[0]); event.target.value = ""; }} /></label>
        <p className="backup-reminder">Backups include program position, preferences, session history, body metrics, and notes.</p>
      </section>
      <section className="panel settings-panel danger-panel"><span className="eyebrow">DANGER ZONE</span><h2>Delete all app data</h2><p>Erase workout history and preferences saved on this device. Export a backup first if you may need this information.</p><button className="danger-button" onClick={onReset}>DELETE ALL LOCAL DATA</button></section>
    </div>
    <footer className="app-footer">MUSCLE FOUNDATION · OFFLINE BY DESIGN · SOURCE PRESCRIPTION UNCHANGED</footer>
  </div>;
}

function SettingRow({ label, detail, children }: { label: string; detail: string; children: React.ReactNode }) {
  return <div className="setting-row"><div><strong>{label}</strong><span>{detail}</span></div>{children}</div>;
}

function WorkoutView({
  session, state, setState, timer, setTimer, onFinish, onExit
}: {
  session: WorkoutSession; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>;
  timer: RestTimerState | null; setTimer: React.Dispatch<React.SetStateAction<RestTimerState | null>>;
  onFinish: (session: WorkoutSession) => void; onExit: () => void;
}) {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel>();
  const exercise = session.exercises[exerciseIndex];
  const completedSets = countCompletedSets(session);
  const totalSets = countPrescribedSets(session);
  const allDone = completedSets === totalSets;
  const prev = getPreviousPerformance(state.workoutSessions, exercise.exerciseId, session.id);
  const last = prev?.filter((set) => set.completed);
  const progress = totalSets ? completedSets / totalSets * 100 : 0;
  const lastCompletedSet = [...exercise.prescribedSets].reverse()
    .find((prescription) => exercise.performedSets.find((set) => set.setNumber === prescription.setNumber)?.completed);

  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    if ("wakeLock" in navigator) {
      void navigator.wakeLock.request("screen").then((next) => { lock = next; setWakeLock(next); }).catch(() => setWakeLock(undefined));
    }
    return () => { void lock?.release(); setWakeLock(undefined); };
  }, []);

  const update = (setNumber: number, changes: Parameters<typeof updateSet>[4]) =>
    setState((current) => updateSet(current, session.id, exercise.exerciseId, setNumber, changes));
  const startRest = (seconds: number) => {
    setTimer(startRestTimer(seconds));
  };
  const moveExercise = (index: number) => setExerciseIndex(Math.min(session.exercises.length - 1, Math.max(0, index)));
  return <div className="workout-view">
    <div className="workout-topbar">
      <button className="icon-button" onClick={onExit} aria-label="Exit workout view">←</button>
      <div><span className="eyebrow">WEEK {String(session.week).padStart(2, "0")} · DAY {session.day}</span><strong>Workout in progress</strong></div>
      <span className="workout-progress-count">{completedSets}/{totalSets}</span>
    </div>
    <div className="workout-progress-track"><i style={{ width: `${progress}%` }} /></div>
    <div className="workout-body">
      <div className="exercise-stepper"><button className="text-button" onClick={() => moveExercise(exerciseIndex - 1)} disabled={exerciseIndex === 0}>← PREVIOUS</button>
        <span>EXERCISE {String(exerciseIndex + 1).padStart(2, "0")} / {String(session.exercises.length).padStart(2, "0")}</span>
        <button className="text-button" onClick={() => moveExercise(exerciseIndex + 1)} disabled={exerciseIndex >= session.exercises.length - 1}>NEXT →</button>
      </div>
      <section className="panel workout-exercise-panel">
        <div className="workout-exercise-title"><div><span className="eyebrow">CURRENT MOVEMENT</span><h1>{EXERCISES.find((item) => item.id === exercise.exerciseId)?.sourceName ?? exercise.exerciseId}</h1></div>
          <span className="exercise-number">{String(exerciseIndex + 1).padStart(2, "0")}</span></div>
        <div className="target-summary"><div><span>TARGET</span><strong>{exercise.prescribedSets.length} sets</strong></div>
          <div><span>REPS</span><strong>{exercise.prescribedSets.map((set) => set.targetReps).join(" · ")}</strong></div>
          <div><span>REST</span><strong>{Math.min(...exercise.prescribedSets.map((set) => set.restSeconds))}–{Math.max(...exercise.prescribedSets.map((set) => set.restSeconds))} sec</strong></div></div>
        <div className="previous-performance"><span className="eyebrow">LAST SESSION</span>
          {last?.length ? <div className="previous-sets">{last.map((set) => <span key={set.setNumber}>{set.weight !== undefined ? formatWeight(set.weight, set.unit ?? state.settings.unit) : "—"} × {set.reps ?? "—"}</span>)}</div> : <strong>No previous data</strong>}
          {wakeLock && <span className="awake-indicator">SCREEN AWAKE</span>}
        </div>
        <div className="set-table">
          <div className="set-table-head"><span>SET</span><span>TARGET</span><span>WEIGHT</span><span>REPS</span><span>DONE</span></div>
          {exercise.prescribedSets.map((prescription) => {
            const set = exercise.performedSets.find((item) => item.setNumber === prescription.setNumber)!;
            return <div className="set-entry" key={prescription.setNumber}>
              <div className={`set-row ${set.completed ? "set-complete" : ""}`}>
                <span className="set-number">{String(set.setNumber).padStart(2, "0")}</span>
                <span className="set-target">{prescription.targetReps} <i>reps · {prescription.restSeconds}s</i></span>
                <label><span className="sr-only">Set {set.setNumber} weight in {state.settings.unit}</span><input aria-label={`Set ${set.setNumber} weight in ${state.settings.unit}`} type="number" inputMode="decimal" min="0" step="0.5" value={set.weight ?? ""} placeholder="—" onChange={(event) => {
                  const raw = event.target.value;
                  const weight = Number(raw);
                  if (!raw || (Number.isFinite(weight) && weight >= 0)) update(set.setNumber, { weight: raw ? weight : undefined, unit: raw ? state.settings.unit : undefined });
                }} /></label>
                <label><span className="sr-only">Set {set.setNumber} actual reps</span><input aria-label={`Set ${set.setNumber} actual reps`} type="number" inputMode="numeric" min="0" step="1" value={set.reps ?? ""} placeholder={String(prescription.targetReps)} onChange={(event) => {
                  const raw = event.target.value;
                  const reps = Number(raw);
                  if (!raw || (Number.isInteger(reps) && reps >= 0)) update(set.setNumber, { reps: raw ? reps : undefined });
                }} /></label>
                <button className={set.completed ? "check-button checked" : "check-button"} aria-label={`${set.completed ? "Unmark" : "Complete"} set ${set.setNumber}`} aria-pressed={set.completed}
                  onClick={() => {
                    const completed = !set.completed;
                    update(set.setNumber, {
                      completed,
                      ...(completed && set.reps === undefined ? { reps: prescription.targetReps } : {})
                    });
                    if (completed && state.settings.defaultRestTimerBehavior === "auto") startRest(prescription.restSeconds);
                  }}>{set.completed ? "✓" : "○"}</button>
              </div>
              <details className="set-extras">
                <summary>Set {set.setNumber} · optional RPE / RIR / note</summary>
                <div className="set-extra-fields">
                  <label>RPE (1–10)<input type="number" min="1" max="10" step="0.5" value={set.rpe ?? ""} onChange={(event) => {
                    const raw = event.target.value;
                    const value = Number(raw);
                    if (!raw || (Number.isFinite(value) && value >= 1 && value <= 10)) update(set.setNumber, { rpe: raw ? value : undefined });
                  }} /></label>
                  <label>RIR<input type="number" min="0" step="1" value={set.rir ?? ""} onChange={(event) => {
                    const raw = event.target.value;
                    const value = Number(raw);
                    if (!raw || (Number.isInteger(value) && value >= 0)) update(set.setNumber, { rir: raw ? value : undefined });
                  }} /></label>
                  <label>Set note<input type="text" maxLength={500} value={set.notes ?? ""} onChange={(event) => update(set.setNumber, { notes: event.target.value })} /></label>
                </div>
              </details>
            </div>;
          })}
        </div>
        {timer === null && lastCompletedSet && <button className="manual-rest-button" onClick={() => startRest(lastCompletedSet.restSeconds)}>
          START {lastCompletedSet.restSeconds} SEC REST
        </button>}
        <label className="exercise-notes"><span>EXERCISE NOTES <i>OPTIONAL</i></span><textarea value={exercise.exerciseNotes ?? ""} maxLength={1000}
          onChange={(event) => setState((current) => updateSession(current, session.id, {
            exercises: current.workoutSessions.find((item) => item.id === session.id)!.exercises.map((item) => item.exerciseId === exercise.exerciseId ? { ...item, exerciseNotes: event.target.value } : item)
          }))} placeholder="Anything to remember next time?" /></label>
      </section>
      {timer !== null && <section className="rest-timer panel" aria-live="polite">
        <div><span className="eyebrow">REST TIMER · PRESCRIBED</span><strong>{formatRestTime(timer.remainingSeconds)}</strong><span>{timer.paused ? "Paused" : "Rest in progress"}</span></div>
        <div className="timer-controls"><button onClick={() => setTimer(toggleRestTimer(timer))}>{timer.paused ? "RESUME" : "PAUSE"}</button><button onClick={() => setTimer(addRestTime(timer))}>+30 SEC</button><button onClick={() => setTimer(skipRestTimer())}>SKIP</button></div>
      </section>}
      <label className="notes-field workout-notes"><span>WORKOUT NOTES</span><textarea value={session.workoutNotes ?? ""} maxLength={2000}
        onChange={(event) => setState((current) => updateSession(current, session.id, { workoutNotes: event.target.value }))} placeholder="How did the session feel?" /></label>
    </div>
    <div className="workout-footer">
      <div><strong>{completedSets} / {totalSets}</strong><span>SETS COMPLETE</span></div>
      <button className="primary-button" onClick={() => onFinish(session)}>{allDone ? "SAVE & FINISH" : "FINISH WORKOUT"} <span>↗</span></button>
    </div>
  </div>;
}

function EmptyMessage({ text }: { text: string }) {
  return <p className="empty-message">{text}</p>;
}

function formatPrescription(sets: Array<{ targetReps: number; restSeconds: number }>) {
  const groups: Array<{ reps: number; rest: number; count: number }> = [];
  sets.forEach((set) => {
    const previous = groups.at(-1);
    if (previous && previous.reps === set.targetReps && previous.rest === set.restSeconds) previous.count += 1;
    else groups.push({ reps: set.targetReps, rest: set.restSeconds, count: 1 });
  });
  const outline = groups.map(({ count, reps, rest }) => `${count}×${reps} @ ${rest}s`).join(" · ");
  return `${sets.length} sets · ${outline}`;
}

export default App;
