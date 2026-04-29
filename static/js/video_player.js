/**
 * video_player.js — Video Player Wrapper
 * ========================================
 * Controls HTML5 <video> and YouTube iframe playback.
 * Persists state via localStorage key "cz_video".
 * Exposes a clean API for the controller to call.
 */
const VideoPlayer = (() => {
  "use strict";

  const STORAGE_KEY = "cz_video";
  const SAVE_INTERVAL = 2000; // ms — how often to persist currentTime

  let _videoEl = null;
  let _wrapperEl = null;
  let _saveTimer = null;
  let _isYouTube = false;
  let _ytPlayer = null;
  let _ytReady = false;        // True once YT.Player fires onReady
  let _ytAPILoading = false;   // Prevents loading the API script twice

  // -------------------------------------------------------------------
  // State helpers
  // -------------------------------------------------------------------

  function defaultState() {
    return { videoUrl: "", currentTime: 0, isPlaying: false };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { /* fail silently */ }
  }

  function clearState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  let _state = null;

  function getState() {
    if (!_state) _state = loadState() || defaultState();
    return { ..._state };
  }

  function setState(updates) {
    if (!_state) _state = loadState() || defaultState();
    Object.assign(_state, updates);
    saveState(_state);
  }

  // -------------------------------------------------------------------
  // YouTube helpers
  // -------------------------------------------------------------------

  /** Extract YouTube video ID from common URL formats. */
  function extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  }

  /**
   * Load the YouTube IFrame Player API script (once).
   * Returns a Promise that resolves when the API is ready.
   */
  function loadYouTubeAPI() {
    return new Promise((resolve) => {
      // Already available
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      // Already loading — wait for callback
      if (_ytAPILoading) {
        const check = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(check);
            resolve();
          }
        }, 100);
        return;
      }

      _ytAPILoading = true;

      // Preserve any existing callback
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === "function") prevCallback();
        resolve();
      };

      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
  }

  // -------------------------------------------------------------------
  // Init — called once by controller
  // -------------------------------------------------------------------

  function init(wrapperSelector) {
    _wrapperEl = document.querySelector(wrapperSelector);
    if (!_wrapperEl) return;

    // Start periodic save of currentTime
    _saveTimer = setInterval(persistCurrentTime, SAVE_INTERVAL);
  }

  function persistCurrentTime() {
    // YouTube path
    if (_isYouTube && _ytPlayer && _ytReady) {
      try {
        const state = _ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          setState({ currentTime: _ytPlayer.getCurrentTime() });
        }
      } catch { /* player may be destroyed */ }
      return;
    }
    // HTML5 path
    if (_videoEl && !_videoEl.paused) {
      setState({ currentTime: _videoEl.currentTime });
    }
  }

  // -------------------------------------------------------------------
  // Load video
  // -------------------------------------------------------------------

  function loadVideo(url) {
    if (!_wrapperEl || !url) return false;
    url = url.trim();

    // Clean up previous
    destroyPlayer();
    _wrapperEl.innerHTML = "";

    const ytId = extractYouTubeId(url);

    if (ytId) {
      _isYouTube = true;
      _ytReady = false;
      _ytPlayer = null;

      // Create a placeholder div for the YT.Player to replace
      const holder = document.createElement("div");
      holder.id = "cz-yt-player";
      _wrapperEl.appendChild(holder);

      setState({ videoUrl: url, currentTime: 0, isPlaying: false });
      emit("video:stateChange", getState());

      // Load the API then create the player
      loadYouTubeAPI().then(() => {
        _ytPlayer = new YT.Player("cz-yt-player", {
          videoId: ytId,
          playerVars: {
            autoplay: 0,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: onYTReady,
            onStateChange: onYTStateChange,
            onError: onYTError,
          },
        });
      });

      return true;
    }

    // HTML5 video
    _isYouTube = false;
    const video = document.createElement("video");
    video.src = url;
    video.preload = "metadata";
    video.playsInline = true;
    _wrapperEl.appendChild(video);
    _videoEl = video;

    // Wire events
    video.addEventListener("play", () => {
      setState({ isPlaying: true });
      emit("video:stateChange", getState());
    });
    video.addEventListener("pause", () => {
      setState({ isPlaying: false, currentTime: video.currentTime });
      emit("video:stateChange", getState());
    });
    video.addEventListener("ended", () => {
      setState({ isPlaying: false, currentTime: 0 });
      emit("video:stateChange", getState());
    });
    video.addEventListener("error", () => {
      emit("video:error", { message: "Failed to load video. Check the URL." });
    });

    // Persist playback position on every timeupdate (throttled to ~1s)
    // Supplements the interval-based save for finer-grained tracking
    let _lastTimeSave = 0;
    video.addEventListener("timeupdate", () => {
      const now = Date.now();
      if (now - _lastTimeSave >= 1000) {
        _lastTimeSave = now;
        setState({ currentTime: video.currentTime });
      }
    });

    setState({ videoUrl: url, currentTime: 0, isPlaying: false });
    emit("video:stateChange", getState());
    return true;
  }

  // -------------------------------------------------------------------
  // YouTube player event handlers
  // -------------------------------------------------------------------

  function onYTReady() {
    _ytReady = true;
    emit("video:stateChange", getState());
  }

  function onYTStateChange(event) {
    const s = event.data;
    if (s === YT.PlayerState.PLAYING) {
      setState({ isPlaying: true });
      emit("video:stateChange", { ...getState(), isPlaying: true });
    } else if (
      s === YT.PlayerState.PAUSED ||
      s === YT.PlayerState.ENDED ||
      s === YT.PlayerState.CUED
    ) {
      const ct = _ytPlayer ? _ytPlayer.getCurrentTime() : 0;
      setState({ isPlaying: false, currentTime: ct });
      emit("video:stateChange", { ...getState(), isPlaying: false });
    }
  }

  function onYTError() {
    emit("video:error", { message: "YouTube video failed to load. Check the URL." });
  }

  // -------------------------------------------------------------------
  // Playback controls
  // -------------------------------------------------------------------

  function play() {
    if (_isYouTube) {
      if (_ytPlayer && _ytReady) {
        try { _ytPlayer.playVideo(); } catch { /* safe no-op */ }
      }
      return;
    }
    if (!_videoEl) return;
    _videoEl.play().catch(() => {});
  }

  function pause() {
    if (_isYouTube) {
      if (_ytPlayer && _ytReady) {
        try { _ytPlayer.pauseVideo(); } catch { /* safe no-op */ }
      }
      return;
    }
    if (!_videoEl) return;
    _videoEl.pause();
  }

  function togglePlayPause() {
    if (_isYouTube) {
      if (!_ytPlayer || !_ytReady) return;
      try {
        const state = _ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          _ytPlayer.pauseVideo();
        } else {
          _ytPlayer.playVideo();
        }
      } catch { /* safe no-op */ }
      return;
    }
    if (!_videoEl) return;
    if (_videoEl.paused) { play(); }
    else { pause(); }
  }

  function seekForward(seconds = 10) {
    if (_isYouTube) {
      if (!_ytPlayer || !_ytReady) return;
      try {
        const ct = _ytPlayer.getCurrentTime();
        const dur = _ytPlayer.getDuration();
        _ytPlayer.seekTo(Math.min(dur, ct + seconds), true);
        setState({ currentTime: Math.min(dur, ct + seconds) });
      } catch { /* safe no-op */ }
      return;
    }
    if (!_videoEl) return;
    _videoEl.currentTime = Math.min(_videoEl.duration || 0, _videoEl.currentTime + seconds);
    setState({ currentTime: _videoEl.currentTime });
  }

  function seekBackward(seconds = 10) {
    if (_isYouTube) {
      if (!_ytPlayer || !_ytReady) return;
      try {
        const ct = _ytPlayer.getCurrentTime();
        _ytPlayer.seekTo(Math.max(0, ct - seconds), true);
        setState({ currentTime: Math.max(0, ct - seconds) });
      } catch { /* safe no-op */ }
      return;
    }
    if (!_videoEl) return;
    _videoEl.currentTime = Math.max(0, _videoEl.currentTime - seconds);
    setState({ currentTime: _videoEl.currentTime });
  }

  function toggleFullscreen() {
    if (!_wrapperEl) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      _wrapperEl.requestFullscreen().catch(() => {});
    }
  }

  /** Get formatted time string MM:SS for current / duration. */
  function getTimeInfo() {
    if (_isYouTube) {
      if (!_ytPlayer || !_ytReady) return { current: "0:00", duration: "0:00" };
      try {
        return {
          current: formatTime(_ytPlayer.getCurrentTime()),
          duration: formatTime(_ytPlayer.getDuration()),
        };
      } catch {
        return { current: "0:00", duration: "0:00" };
      }
    }
    if (!_videoEl) return { current: "0:00", duration: "0:00" };
    return {
      current: formatTime(_videoEl.currentTime),
      duration: formatTime(_videoEl.duration || 0),
    };
  }

  function formatTime(sec) {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function isLoaded() {
    return !!_videoEl || _isYouTube;
  }

  function isYouTube() {
    return _isYouTube;
  }

  // -------------------------------------------------------------------
  // Recovery — restore from localStorage
  // -------------------------------------------------------------------

  function recover() {
    const saved = loadState();
    if (!saved || !saved.videoUrl) return;

    // Validate saved currentTime — guard against corrupted localStorage
    const savedTime = (typeof saved.currentTime === "number" && isFinite(saved.currentTime) && saved.currentTime >= 0)
      ? saved.currentTime
      : 0;
    const wasPlaying = !!saved.isPlaying;

    _state = saved;
    loadVideo(saved.videoUrl);

    // For HTML5 video, restore position (and optionally play state) after metadata loads
    if (!_isYouTube && _videoEl) {
      _videoEl.addEventListener("loadedmetadata", () => {
        try {
          _videoEl.currentTime = savedTime;
        } catch { /* video may not support seeking yet — fail gracefully */ }

        // Resume playback only if the video was playing before reload
        if (wasPlaying) {
          _videoEl.play().catch(() => { /* auto-play may be blocked by browser */ });
        }
      }, { once: true });

      // Fallback: handle case where loadedmetadata already fired
      if (_videoEl.readyState >= 1) {
        try {
          _videoEl.currentTime = savedTime;
          if (wasPlaying) _videoEl.play().catch(() => {});
        } catch { /* safe fallback */ }
      }
    }
  }

  // -------------------------------------------------------------------
  // Event helper
  // -------------------------------------------------------------------

  function emit(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // -------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------

  /** Destroy only the current player instance (reusable internally). */
  function destroyPlayer() {
    if (_ytPlayer) {
      try { _ytPlayer.destroy(); } catch { /* may already be gone */ }
      _ytPlayer = null;
      _ytReady = false;
    }
    if (_videoEl) {
      _videoEl.pause();
      _videoEl.src = "";
      _videoEl = null;
    }
    _isYouTube = false;
  }

  /** Full teardown — clear intervals and player. */
  function destroy() {
    if (_saveTimer) clearInterval(_saveTimer);
    destroyPlayer();
  }

  // -------------------------------------------------------------------
  // Expose
  // -------------------------------------------------------------------
  return {
    init,
    loadVideo,
    play,
    pause,
    togglePlayPause,
    seekForward,
    seekBackward,
    toggleFullscreen,
    getState,
    getTimeInfo,
    isLoaded,
    isYouTube,
    recover,
    destroy,
  };
})();
