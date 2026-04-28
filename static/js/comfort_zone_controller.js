/**
 * comfort_zone_controller.js — Orchestration Layer
 * ===================================================
 * Connects Pomodoro timer <-> Video Player <-> UI.
 * Handles session guard, event wiring, popup system, and DOM bindings.
 */
(() => {
  "use strict";

  // -------------------------------------------------------------------
  // Session Guard — redirect if not logged in
  // -------------------------------------------------------------------
  const session = State.getSession();
  if (!session || !session.user_id) {
    window.location.href = "/";
    return;
  }

  // -------------------------------------------------------------------
  // DOM References
  // -------------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const timerCard       = $("#cz-timer-card");
  const timerDisplay    = $("#cz-timer-display");
  const timerMode       = $("#cz-timer-mode");
  const timerSession    = $("#cz-timer-session");
  const ringProgress    = $("#ring-progress");
  const btnStart        = $("#cz-btn-start");
  const btnPause        = $("#cz-btn-pause");
  const btnReset        = $("#cz-btn-reset");
  const inputWork       = $("#cz-input-work");
  const inputBreak      = $("#cz-input-break");
  const inputSessions   = $("#cz-input-sessions");
  const videoUrlInput   = $("#cz-video-url");
  const btnLoadVideo    = $("#cz-btn-load-video");
  const btnPlayPause    = $("#cz-btn-play-pause");
  const btnBackward     = $("#cz-btn-backward");
  const btnForward      = $("#cz-btn-forward");
  const btnFullscreen   = $("#cz-btn-fullscreen");
  const videoStatus     = $("#cz-video-status");
  
  // Bootstrap Modal instance
  let czModal = null;
  const popupModalEl    = $("#cz-popup-modal");
  const popupIcon       = $("#cz-popup-icon");
  const popupTitle      = $("#cz-popup-title");
  const popupSubtitle   = $("#cz-popup-subtitle");
  const popupActions    = $("#cz-popup-actions");
  
  const toastContainer  = $("#cz-toast-container");
  const userName        = $("#cz-user-name");

  // Ring circumference for progress calculation
  const RING_RADIUS = 96;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  // -------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------
  function init() {
    // Initialize Bootstrap Modal if present
    if (popupModalEl) {
      czModal = new bootstrap.Modal(popupModalEl, { backdrop: 'static', keyboard: false });
    }

    // Set user name in top bar
    if (userName) userName.textContent = session.username;

    // Initialize ring
    if (ringProgress) {
      ringProgress.setAttribute("r", RING_RADIUS);
      ringProgress.setAttribute("cx", "110");
      ringProgress.setAttribute("cy", "110");
      ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
      ringProgress.style.strokeDashoffset = 0;
    }

    // Also set the background ring
    const ringBg = $(".ring-bg");
    if (ringBg) {
      ringBg.setAttribute("r", RING_RADIUS);
      ringBg.setAttribute("cx", "110");
      ringBg.setAttribute("cy", "110");
    }

    // Init video player
    VideoPlayer.init("#cz-video-wrapper");

    // Init notes editor (compact mode for Comfort Zone)
    NotesEditor.init("#cz-notes-container", session.user_id, { compact: true });

    // Bind UI events
    bindEvents();

    // Recover saved state
    recoverState();

    // Update video status periodically
    setInterval(updateVideoStatus, 500);
  }

  // -------------------------------------------------------------------
  // Event Binding
  // -------------------------------------------------------------------
  function bindEvents() {
    // Timer controls
    btnStart.addEventListener("click", handleStart);
    btnPause.addEventListener("click", handlePauseResume);
    btnReset.addEventListener("click", handleReset);

    // Video controls
    btnLoadVideo.addEventListener("click", handleLoadVideo);
    videoUrlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLoadVideo();
    });
    btnPlayPause.addEventListener("click", () => VideoPlayer.togglePlayPause());
    btnBackward.addEventListener("click", () => VideoPlayer.seekBackward(10));
    btnForward.addEventListener("click", () => VideoPlayer.seekForward(10));
    btnFullscreen.addEventListener("click", () => VideoPlayer.toggleFullscreen());

    // Pomodoro events (from pomodoro.js)
    document.addEventListener("pomodoro:tick", onTick);
    document.addEventListener("pomodoro:sessionEnd", onSessionEnd);
    document.addEventListener("pomodoro:modeSwitch", onModeSwitch);
    document.addEventListener("pomodoro:breakEnd", onBreakEnd);
    document.addEventListener("pomodoro:complete", onComplete);
    document.addEventListener("pomodoro:reset", onReset);

    // Video events
    document.addEventListener("video:stateChange", onVideoStateChange);
    document.addEventListener("video:error", (e) => {
      toast(e.detail.message || "Video error", "error");
    });

    // Settings inputs — disable while timer is running
    [inputWork, inputBreak, inputSessions].forEach((inp) => {
      inp.addEventListener("change", () => {
        // Clamp values
        if (parseInt(inp.value) < 1) inp.value = 1;
      });
    });
  }

  // -------------------------------------------------------------------
  // Timer Handlers
  // -------------------------------------------------------------------

  function handleStart() {
    const work = parseInt(inputWork.value, 10);
    const brk = parseInt(inputBreak.value, 10);
    const sess = parseInt(inputSessions.value, 10);

    if (!work || work < 1 || !brk || brk < 1 || !sess || sess < 1) {
      toast("Please enter valid settings (minimum 1 for each).", "error");
      return;
    }

    const ok = Pomodoro.start(work, brk, sess);
    if (ok) {
      updateControlButtons("running");
      lockSettings(true);
      toast("Pomodoro started! Focus time 🎯", "success");
    }
  }

  function handlePauseResume() {
    const s = Pomodoro.getState();
    if (s.isPaused) {
      Pomodoro.resume();
      updateControlButtons("running");
      // Resume video if in work mode
      if (s.mode === "work" && VideoPlayer.isLoaded()) {
        VideoPlayer.play();
      }
    } else {
      Pomodoro.pause();
      updateControlButtons("paused");
      VideoPlayer.pause();
    }
  }

  function handleReset() {
    Pomodoro.reset();
    VideoPlayer.pause();
    updateControlButtons("idle");
    lockSettings(false);
    toast("Timer reset.", "info");
  }

  // -------------------------------------------------------------------
  // Video Handlers
  // -------------------------------------------------------------------

  function handleLoadVideo() {
    const url = videoUrlInput.value.trim();
    if (!url) {
      toast("Please enter a video URL.", "error");
      return;
    }
    const ok = VideoPlayer.loadVideo(url);
    if (ok) {
      toast("Video loaded!", "success");
    }
  }

  // -------------------------------------------------------------------
  // Pomodoro Event Handlers
  // -------------------------------------------------------------------

  function onTick(e) {
    const s = e.detail;
    updateTimerDisplay(s);
    updateRing(s);
  }

  function onSessionEnd(e) {
    const s = e.detail;

    // Exit fullscreen so popup is visible (Bug #3 fix)
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Pause video (Bug #2 fix — now works for YouTube too)
    VideoPlayer.pause();

    // Show popup
    const isLastSession = s.currentSession >= s.totalSessions;
    showPopup({
      icon: "🎉",
      title: `Session ${s.currentSession} completed!`,
      subtitle: isLastSession
        ? "That was your last session. Great work!"
        : `${s.totalSessions - s.currentSession} session(s) remaining. What would you like to do?`,
      actions: isLastSession
        ? [
            { label: "🏁 Finish", class: "btn-primary", handler: () => { hidePopup(); handleReset(); } },
          ]
        : [
            { label: "▶ Continue", class: "btn-primary", handler: () => {
                hidePopup();
                Pomodoro.nextSession();
                if (VideoPlayer.isLoaded()) VideoPlayer.play();
                updateControlButtons("running");
              }
            },
            { label: "☕ Take Break", class: "btn-warning", handler: () => {
                hidePopup();
                Pomodoro.startBreak();
                updateControlButtons("running");
                // Video stays paused during break
              }
            },
          ],
    });
  }

  function onModeSwitch(e) {
    const s = e.detail;
    // Animate mode switch
    if (timerCard) {
      timerCard.classList.add("mode-switching");
      setTimeout(() => timerCard.classList.remove("mode-switching"), 500);
    }

    updateTimerDisplay(s);
    updateRing(s);

    if (s.mode === "work") {
      toast("Work time! Let's focus 💪", "info");
      // Resume video in work mode (now works for YouTube too)
      if (VideoPlayer.isLoaded()) {
        VideoPlayer.play();
      }
    } else {
      toast("Break time! Relax ☕", "info");
      VideoPlayer.pause();
    }
  }

  function onBreakEnd(e) {
    const s = e.detail;

    // Exit fullscreen so popup is visible
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Video stays paused — do NOT auto-play
    VideoPlayer.pause();

    // Show break-ended popup with explicit user choices
    showPopup({
      icon: "☕",
      title: "Break is over!",
      subtitle: `Session ${s.currentSession} of ${s.totalSessions} completed. Ready to continue?`,
      actions: [
        {
          label: "💪 Start Work Session",
          class: "btn-primary",
          handler: () => {
            hidePopup();
            // nextSession() increments the counter and starts work
            Pomodoro.nextSession();
            if (VideoPlayer.isLoaded()) VideoPlayer.play();
            updateControlButtons("running");
          },
        },
        {
          label: "☕ Take Another Break",
          class: "btn-warning",
          handler: () => {
            hidePopup();
            // startBreak() does NOT touch the session counter
            Pomodoro.startBreak();
            updateControlButtons("running");
            // Video stays paused during break
          },
        },
      ],
    });
  }

  function onComplete(e) {
    // Exit fullscreen so popup is visible (Bug #3 fix)
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    VideoPlayer.pause();

    showPopup({
      icon: "🏆",
      title: "All sessions completed!",
      subtitle: "Amazing work! You've completed all your Pomodoro sessions.",
      actions: [
        { label: "🔄 Start Over", class: "btn-primary", handler: () => { hidePopup(); handleReset(); } },
      ],
    });
    updateControlButtons("idle");
    lockSettings(false);
  }

  function onReset() {
    updateTimerDisplay(Pomodoro.getState());
    updateRing(Pomodoro.getState());
  }

  function onVideoStateChange(e) {
    updatePlayPauseIcon(e.detail.isPlaying);
  }

  // -------------------------------------------------------------------
  // UI Updates
  // -------------------------------------------------------------------

  function updateTimerDisplay(s) {
    // Time display
    const mins = Math.floor(s.remainingTime / 60);
    const secs = Math.floor(s.remainingTime % 60);
    if (timerDisplay) {
      timerDisplay.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    // Mode label
    if (timerMode) {
      timerMode.textContent = s.isRunning ? (s.mode === "work" ? "Focus" : "Break") : "Ready";
    }

    // Session indicator
    if (timerSession) {
      timerSession.textContent = s.isRunning || s.remainingTime > 0
        ? `Session ${s.currentSession} of ${s.totalSessions}`
        : "Configure settings below";
    }

    // Data attribute for CSS mode coloring
    if (timerCard) {
      timerCard.setAttribute("data-mode", s.mode);
    }
  }

  function updateRing(s) {
    if (!ringProgress) return;
    if (s.initialTime <= 0) {
      ringProgress.style.strokeDashoffset = 0;
      return;
    }
    const progress = s.remainingTime / s.initialTime;
    const offset = RING_CIRCUMFERENCE * (1 - progress);
    ringProgress.style.strokeDashoffset = offset;
  }

  function updateControlButtons(mode) {
    // mode: "idle" | "running" | "paused"
    if (mode === "idle") {
      btnStart.style.display = "inline-flex";
      btnPause.style.display = "none";
      btnReset.style.display = "none";
      btnPause.textContent = "⏸ Pause";
    } else if (mode === "running") {
      btnStart.style.display = "none";
      btnPause.style.display = "inline-flex";
      btnReset.style.display = "inline-flex";
      btnPause.textContent = "⏸ Pause";
      btnPause.className = "btn btn-warning fw-bold px-4";
    } else if (mode === "paused") {
      btnStart.style.display = "none";
      btnPause.style.display = "inline-flex";
      btnReset.style.display = "inline-flex";
      btnPause.textContent = "▶ Resume";
      btnPause.className = "btn btn-success fw-bold px-4";
    }
  }

  function lockSettings(locked) {
    [inputWork, inputBreak, inputSessions].forEach((inp) => {
      inp.disabled = locked;
      inp.style.opacity = locked ? "0.5" : "1";
    });
  }

  function updatePlayPauseIcon(isPlaying) {
    if (btnPlayPause) {
      btnPlayPause.textContent = isPlaying ? "⏸" : "▶";
    }
  }

  function updateVideoStatus() {
    if (!videoStatus) return;
    if (!VideoPlayer.isLoaded()) {
      videoStatus.textContent = "";
      return;
    }
    const info = VideoPlayer.getTimeInfo();
    videoStatus.textContent = `${info.current} / ${info.duration}`;
  }

  // -------------------------------------------------------------------
  // Popup System
  // -------------------------------------------------------------------

  function showPopup({ icon, title, subtitle, actions }) {
    if (popupIcon) popupIcon.textContent = icon;
    if (popupTitle) popupTitle.textContent = title;
    if (popupSubtitle) popupSubtitle.textContent = subtitle;

    if (popupActions) {
      popupActions.innerHTML = "";
      actions.forEach((a) => {
        const btn = document.createElement("button");
        btn.className = `btn fw-bold px-4 ${a.class || "btn-primary"}`;
        btn.textContent = a.label;
        btn.addEventListener("click", a.handler);
        popupActions.appendChild(btn);
      });
    }

    if (czModal) czModal.show();
  }

  function hidePopup() {
    if (czModal) czModal.hide();
  }

  // -------------------------------------------------------------------
  // Toast
  // -------------------------------------------------------------------

  function toast(msg, type = "success") {
    if (!toastContainer) return;
    const bgClass = type === "error" ? "bg-danger" : type === "info" ? "bg-info" : "bg-success";
    const tHTML = `
      <div class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body fw-bold">${msg}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;
    toastContainer.insertAdjacentHTML("beforeend", tHTML);
    const toastEl = toastContainer.lastElementChild;
    const bsToast = new bootstrap.Toast(toastEl, { delay: 3000 });
    bsToast.show();
    
    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }

  // -------------------------------------------------------------------
  // State Recovery
  // -------------------------------------------------------------------

  function recoverState() {
    // Recover timer
    const timerState = Pomodoro.getState();
    if (timerState.isRunning || timerState.isPaused) {
      // Restore settings inputs from saved state
      inputWork.value = timerState.workDuration || 25;
      inputBreak.value = timerState.breakDuration || 5;
      inputSessions.value = timerState.totalSessions || 4;
      lockSettings(true);

      if (timerState.isPaused) {
        updateControlButtons("paused");
      } else {
        updateControlButtons("running");
      }
    } else {
      updateControlButtons("idle");
    }

    // Let pomodoro.js handle its own recovery (recalculates time)
    Pomodoro.recover();

    // Recover video
    const videoState = VideoPlayer.getState();
    if (videoState.videoUrl) {
      videoUrlInput.value = videoState.videoUrl;
    }
    VideoPlayer.recover();

    // Initial display
    updateTimerDisplay(Pomodoro.getState());
    updateRing(Pomodoro.getState());
  }

  // -------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------
  init();
})();
