/**
 * pomodoro.js — Pomodoro Timer Engine
 * =====================================
 * Pure timer logic. No video or UI awareness.
 * Dispatches CustomEvents on document for the controller to listen to.
 * Persists state via localStorage key "cz_timer".
 */
const Pomodoro = (() => {
  "use strict";

  const STORAGE_KEY = "cz_timer";
  const TICK_INTERVAL = 250; // ms — UI refresh rate

  let _interval = null;

  // -------------------------------------------------------------------
  // State helpers
  // -------------------------------------------------------------------

  /** Default (empty) state. */
  function defaultState() {
    return {
      currentSession: 1,
      totalSessions: 4,
      mode: "work",        // "work" | "break"
      remainingTime: 0,    // seconds
      initialTime: 0,      // seconds (for progress calc)
      isRunning: false,
      isPaused: false,
      startedAt: null,      // timestamp ms
      workDuration: 25,     // minutes
      breakDuration: 5,     // minutes
    };
  }

  /** Read state from localStorage. */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /** Write state to localStorage. */
  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* storage full — fail silently */ }
  }

  /** Clear persisted state. */
  function clearState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Get current in-memory state (or load from storage). */
  let _state = null;

  function getState() {
    if (!_state) {
      _state = loadState() || defaultState();
    }
    return { ..._state };
  }

  function setState(updates) {
    if (!_state) _state = loadState() || defaultState();
    Object.assign(_state, updates);
    saveState(_state);
  }

  // -------------------------------------------------------------------
  // Event dispatching
  // -------------------------------------------------------------------

  function emit(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // -------------------------------------------------------------------
  // Core timer tick
  // -------------------------------------------------------------------

  function tick() {
    const s = getState();
    if (!s.isRunning || s.isPaused) return;

    // Calculate real remaining time from timestamp
    const elapsed = (Date.now() - s.startedAt) / 1000;
    const remaining = Math.max(0, s.initialTime - elapsed);

    setState({ remainingTime: remaining });
    emit("pomodoro:tick", getState());

    if (remaining <= 0) {
      handleTimerEnd();
    }
  }

  function handleTimerEnd() {
    stopInterval();
    const s = getState();

    if (s.mode === "work") {
      // Work session finished
      setState({ isRunning: false, isPaused: false, remainingTime: 0 });
      emit("pomodoro:sessionEnd", getState());
    } else {
      // Break finished — stop and let the controller decide next action.
      // Do NOT auto-advance. Emit breakEnd so the UI can show a popup
      // giving the user the choice to start work or take another break.
      // Session counter is NOT modified here — only nextSession() does that.
      setState({ isRunning: false, isPaused: false, remainingTime: 0 });
      emit("pomodoro:breakEnd", getState());
    }
  }

  // -------------------------------------------------------------------
  // Interval management
  // -------------------------------------------------------------------

  function startInterval() {
    stopInterval();
    _interval = setInterval(tick, TICK_INTERVAL);
  }

  function stopInterval() {
    if (_interval) {
      clearInterval(_interval);
      _interval = null;
    }
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Start a new Pomodoro session.
   * @param {number} workMin  — work duration in minutes
   * @param {number} breakMin — break duration in minutes
   * @param {number} sessions — total number of work sessions
   * @returns {boolean} true if started, false if invalid
   */
  function start(workMin, breakMin, sessions) {
    workMin = parseInt(workMin, 10);
    breakMin = parseInt(breakMin, 10);
    sessions = parseInt(sessions, 10);

    if (!workMin || workMin < 1 || !breakMin || breakMin < 1 || !sessions || sessions < 1) {
      return false;
    }

    const workSec = workMin * 60;

    _state = {
      currentSession: 1,
      totalSessions: sessions,
      mode: "work",
      remainingTime: workSec,
      initialTime: workSec,
      isRunning: true,
      isPaused: false,
      startedAt: Date.now(),
      workDuration: workMin,
      breakDuration: breakMin,
    };
    saveState(_state);
    startInterval();
    emit("pomodoro:tick", getState());
    return true;
  }

  /** Pause the running timer. */
  function pause() {
    const s = getState();
    if (!s.isRunning || s.isPaused) return;

    // Snapshot remaining time
    const elapsed = (Date.now() - s.startedAt) / 1000;
    const remaining = Math.max(0, s.initialTime - elapsed);

    setState({
      isPaused: true,
      remainingTime: remaining,
      startedAt: null,
    });
    stopInterval();
    emit("pomodoro:tick", getState());
  }

  /** Resume from pause. */
  function resume() {
    const s = getState();
    if (!s.isRunning || !s.isPaused) return;

    setState({
      isPaused: false,
      initialTime: s.remainingTime,
      startedAt: Date.now(),
    });
    startInterval();
    emit("pomodoro:tick", getState());
  }

  /** Full reset — clear everything. */
  function reset() {
    stopInterval();
    _state = defaultState();
    clearState();
    emit("pomodoro:reset", getState());
  }

  /** Start the next work session (called from popup "Continue"). */
  function nextSession() {
    const s = getState();
    const next = s.currentSession + 1;

    if (next > s.totalSessions) {
      // No more sessions
      reset();
      emit("pomodoro:complete", getState());
      return;
    }

    const workSec = s.workDuration * 60;
    setState({
      currentSession: next,
      mode: "work",
      remainingTime: workSec,
      initialTime: workSec,
      isRunning: true,
      isPaused: false,
      startedAt: Date.now(),
    });
    startInterval();
    emit("pomodoro:modeSwitch", getState());
  }

  /** Start a break period (called from popup "Take Break"). */
  function startBreak() {
    const s = getState();
    const breakSec = s.breakDuration * 60;

    setState({
      mode: "break",
      remainingTime: breakSec,
      initialTime: breakSec,
      isRunning: true,
      isPaused: false,
      startedAt: Date.now(),
    });
    startInterval();
    emit("pomodoro:modeSwitch", getState());
  }

  // -------------------------------------------------------------------
  // Recovery — called on page load
  // -------------------------------------------------------------------

  function recover() {
    const saved = loadState();
    if (!saved) return;

    _state = saved;

    if (saved.isRunning && !saved.isPaused && saved.startedAt) {
      // Recalculate remaining time from real clock
      const elapsed = (Date.now() - saved.startedAt) / 1000;
      const remaining = Math.max(0, saved.initialTime - elapsed);

      if (remaining <= 0) {
        // Timer expired while away
        handleTimerEnd();
      } else {
        setState({ remainingTime: remaining });
        startInterval();
      }
    }
    // Emit current state so UI can render
    emit("pomodoro:tick", getState());
  }

  // -------------------------------------------------------------------
  // Expose
  // -------------------------------------------------------------------
  return {
    start,
    pause,
    resume,
    reset,
    nextSession,
    startBreak,
    getState,
    recover,
  };
})();
