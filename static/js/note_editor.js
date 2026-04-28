/**
 * notes_editor.js — Notes Editor Module
 * ========================================
 * Self-contained module for creating, editing, and managing notes.
 * Works in both Comfort Zone (compact) and Notes page (full) contexts.
 * Handles title-based identity logic, rich text editing, and API persistence.
 */
const NotesEditor = (() => {
  "use strict";

  // -------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------
  let _userId = null;
  let _containerEl = null;
  let _mounted = false;

  // Current editor state
  let _currentNoteId = null;   // UUID of loaded note (null = new)
  let _originalTitle = "";     // Title at time of load/last save
  let _originalBody = "";      // Body at time of load/last save
  let _isSaving = false;       // Debounce guard

  // Notes list cache
  let _notes = [];

  // DOM refs (set on mount)
  let _titleInput = null;
  let _bodyEl = null;
  let _saveBtn = null;
  let _deleteBtn = null;
  let _newBtn = null;
  let _listEl = null;
  let _searchInput = null;
  let _statusEl = null;
  let _confirmOverlay = null;

  // -------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------

  /**
   * Initialize the notes editor inside a container element.
   * @param {string} containerSelector - CSS selector for the mount point.
   * @param {number} userId - The logged-in user's ID.
   * @param {object} options - Optional: { compact: true } for Comfort Zone mode.
   */
  function init(containerSelector, userId, options = {}) {
    _containerEl = document.querySelector(containerSelector);
    if (!_containerEl || _mounted) return;

    _userId = userId;
    _mounted = true;

    render(options.compact || false);
    bindEvents();
    refresh();
  }

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  
  function render(compact) {
    const compactClass = compact ? " cz-notes-compact" : "";

    _containerEl.innerHTML = `
      <div class="d-flex flex-column h-100${compactClass}">
        <!-- Editor Area -->
        <div class="card shadow-sm border-0 mb-3 flex-grow-1">
          <div class="card-body d-flex flex-column p-3">
            <input type="text" class="form-control fw-bold mb-2" id="cz-note-title"
                   placeholder="Note title..." maxlength="200">
            <div class="btn-group mb-2">
              <button type="button" class="btn btn-sm btn-outline-secondary cz-note-tool-btn" data-cmd="bold" title="Bold"><b>B</b></button>
              <button type="button" class="btn btn-sm btn-outline-secondary cz-note-tool-btn" data-cmd="italic" title="Italic"><i>I</i></button>
              <button type="button" class="btn btn-sm btn-outline-secondary cz-note-tool-btn" data-cmd="insertUnorderedList" title="Bullet List">☰</button>
              <button type="button" class="btn btn-sm btn-outline-secondary cz-note-tool-btn" data-cmd="fontSize" data-value="5" title="Increase Font">A+</button>
              <button type="button" class="btn btn-sm btn-outline-secondary cz-note-tool-btn" data-cmd="fontSize" data-value="2" title="Decrease Font">A−</button>
            </div>
            <div class="cz-note-body form-control flex-grow-1" id="cz-note-body" contenteditable="true"
                 data-placeholder="Start writing your notes..." style="overflow-y: auto;"></div>
            <div class="d-flex gap-2 mt-3 flex-wrap">
              <button class="btn btn-primary btn-sm fw-bold" id="cz-note-save">💾 Save Note</button>
              <button class="btn btn-outline-danger btn-sm fw-bold" id="cz-note-delete" style="display:none">🗑 Delete</button>
              <button class="btn btn-outline-success btn-sm fw-bold" id="cz-note-new" style="display:none">✨ New Note</button>
            </div>
            <div class="small mt-2" id="cz-note-status"></div>
          </div>
        </div>

        <!-- Notes List -->
        <div class="card shadow-sm border-0 cz-note-list-area">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="text-uppercase text-muted fw-bold small">📝 Saved Notes</span>
              <input type="text" class="form-control form-control-sm w-auto" id="cz-note-search"
                     placeholder="Search notes...">
            </div>
            <div class="list-group list-group-flush cz-note-list" id="cz-note-list"></div>
          </div>
        </div>
      </div>
    `;

    // Cache DOM refs
    _titleInput = _containerEl.querySelector("#cz-note-title");
    _bodyEl = _containerEl.querySelector("#cz-note-body");
    _saveBtn = _containerEl.querySelector("#cz-note-save");
    _deleteBtn = _containerEl.querySelector("#cz-note-delete");
    _newBtn = _containerEl.querySelector("#cz-note-new");
    _listEl = _containerEl.querySelector("#cz-note-list");
    _searchInput = _containerEl.querySelector("#cz-note-search");
    _statusEl = _containerEl.querySelector("#cz-note-status");
  }

  // -------------------------------------------------------------------
  // Event Binding
  // -------------------------------------------------------------------

  function bindEvents() {
    // Toolbar buttons
    _containerEl.querySelectorAll(".cz-note-tool-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        const val = btn.dataset.value || null;
        document.execCommand(cmd, false, val);
        _bodyEl.focus();
      });
    });

    // Save
    _saveBtn.addEventListener("click", handleSave);

    // Delete
    _deleteBtn.addEventListener("click", () => showConfirm());

    // New Note
    _newBtn.addEventListener("click", clearEditor);

    // Search
    _searchInput.addEventListener("input", handleSearch);

    // Keyboard shortcut: Ctrl+S to save
    _containerEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    });
  }

  // -------------------------------------------------------------------
  // Save Logic (CRITICAL — title-based identity)
  // -------------------------------------------------------------------

  async function handleSave() {
    if (_isSaving) return;

    const currentTitle = (_titleInput.value || "").trim();
    const currentBody = _bodyEl.innerHTML || "";

    // Validation: title required
    if (!currentTitle) {
      showStatus("❌ Title is required.", "error");
      _titleInput.focus();
      return;
    }

    // Skip save if nothing changed
    if (_currentNoteId && currentTitle === _originalTitle && currentBody === _originalBody) {
      showStatus("✅ No changes to save.", "info");
      return;
    }

    _isSaving = true;
    _saveBtn.disabled = true;
    _saveBtn.textContent = "⏳ Saving...";

    try {
      let result;

      if (_currentNoteId && currentTitle === _originalTitle) {
        // SAME title → UPDATE existing note
        result = await API.updateNote(_currentNoteId, _userId, currentTitle, currentBody);
        const note = result.note;
        _originalBody = currentBody;
        _originalTitle = currentTitle;
        showStatus("✅ Note updated.", "success");
      } else {
        // NEW note OR title changed → CREATE new note
        result = await API.createNote(_userId, currentTitle, currentBody);
        const note = result.note;
        _currentNoteId = note.id;
        _originalTitle = currentTitle;
        _originalBody = currentBody;
        showStatus("✅ Note created.", "success");
      }

      // Show delete + new buttons
      _deleteBtn.style.display = "inline-flex";
      _newBtn.style.display = "inline-flex";

      // Refresh list
      await refresh();
    } catch (err) {
      showStatus(`❌ ${err}`, "error");
    } finally {
      _isSaving = false;
      _saveBtn.disabled = false;
      _saveBtn.textContent = "💾 Save Note";
    }
  }

  // -------------------------------------------------------------------
  // Delete Logic
  // -------------------------------------------------------------------

  let _deleteTargetId = null;

  function showConfirm(noteId) {
    _deleteTargetId = noteId || _currentNoteId;
    if (!_deleteTargetId) return;

    if (confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
      handleConfirmDelete();
    }
  }

  function hideConfirm() {
    _deleteTargetId = null;
  }

  async function handleConfirmDelete() {
    if (!_deleteTargetId) { hideConfirm(); return; }

    try {
      await API.deleteNote(_deleteTargetId, _userId);

      // If deleting the currently open note, clear editor
      if (_deleteTargetId === _currentNoteId) {
        clearEditor();
      }

      showStatus("🗑 Note deleted.", "success");
      await refresh();
    } catch (err) {
      showStatus(`❌ ${err}`, "error");
    } finally {
      hideConfirm();
    }
  }

  // -------------------------------------------------------------------
  // Load / Clear Editor
  // -------------------------------------------------------------------

  function loadNote(note) {
    _currentNoteId = note.id;
    _originalTitle = note.title;
    _originalBody = note.body || "";

    _titleInput.value = note.title;
    _bodyEl.innerHTML = note.body || "";

    _deleteBtn.style.display = "inline-flex";
    _newBtn.style.display = "inline-flex";

    showStatus(`📝 Editing: ${note.title}`, "info");

    // Highlight active in list
    highlightActive(note.id);
  }

  function clearEditor() {
    _currentNoteId = null;
    _originalTitle = "";
    _originalBody = "";

    _titleInput.value = "";
    _bodyEl.innerHTML = "";

    _deleteBtn.style.display = "none";
    _newBtn.style.display = "none";

    showStatus("", "");
    highlightActive(null);
    _titleInput.focus();
  }

  // -------------------------------------------------------------------
  // Notes List
  // -------------------------------------------------------------------

  async function refresh() {
    if (!_userId) return;

    try {
      const result = await API.getNotes(_userId);
      _notes = result.notes || [];
      renderList(_notes);
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  }

  function renderList(notes) {
    if (!_listEl) return;

    if (!notes.length) {
      _listEl.innerHTML = `
        <div class="text-center text-muted p-4">
          <span class="fs-1 d-block mb-2 opacity-50">📭</span>
          <span class="small">No notes yet. Start writing!</span>
        </div>`;
      return;
    }

    _listEl.innerHTML = notes.map((n) => `
      <div class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2 cz-note-item${n.id === _currentNoteId ? ' active' : ''}" data-id="${n.id}" style="cursor: pointer;">
        <div class="cz-note-item-content text-truncate">
          <div class="cz-note-item-title fw-bold small">${escapeHtml(n.title)}</div>
          <div class="cz-note-item-date" style="font-size: 0.7rem;">${formatDate(n.created_at)}</div>
        </div>
        <div class="cz-note-item-actions d-flex gap-1 ms-2">
          <button class="btn btn-sm btn-outline-secondary border-0 p-1 cz-note-item-edit" data-id="${n.id}" title="Edit">✏️</button>
          <button class="btn btn-sm btn-outline-danger border-0 p-1 cz-note-item-del" data-id="${n.id}" title="Delete">🗑</button>
        </div>
      </div>
    `).join("");

    // Wire click handlers
    _listEl.querySelectorAll(".cz-note-item-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const note = _notes.find((n) => n.id === btn.dataset.id);
        if (note) loadNote(note);
      });
    });

    _listEl.querySelectorAll(".cz-note-item-del").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        showConfirm(btn.dataset.id);
      });
    });

    // Click on row to edit
    _listEl.querySelectorAll(".cz-note-item").forEach((row) => {
      row.addEventListener("click", () => {
        const note = _notes.find((n) => n.id === row.dataset.id);
        if (note) loadNote(note);
      });
    });
  }

  function highlightActive(id) {
    if (!_listEl) return;
    _listEl.querySelectorAll(".cz-note-item").forEach((row) => {
      row.classList.toggle("active", row.dataset.id === id);
    });
  }

  // -------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------

  let _searchTimeout = null;

  function handleSearch() {
    clearTimeout(_searchTimeout);
    _searchTimeout = setTimeout(async () => {
      const q = (_searchInput.value || "").trim();
      if (!q) {
        renderList(_notes);
        return;
      }
      try {
        const result = await API.searchNotes(_userId, q);
        renderList(result.notes || []);
      } catch {
        // Fallback to local filter
        const filtered = _notes.filter((n) =>
          n.title.toLowerCase().includes(q.toLowerCase())
        );
        renderList(filtered);
      }
    }, 300);
  }

  // -------------------------------------------------------------------
  // Status Display
  // -------------------------------------------------------------------

  function showStatus(msg, type) {
    if (!_statusEl) return;
    _statusEl.textContent = msg;
    _statusEl.className = `cz-note-status${type ? " " + type : ""}`;
    if (msg && type !== "error") {
      setTimeout(() => {
        if (_statusEl.textContent === msg) _statusEl.textContent = "";
      }, 4000);
    }
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  function escapeHtml(str) {
    const el = document.createElement("span");
    el.textContent = str;
    return el.innerHTML;
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  // -------------------------------------------------------------------
  // Expose
  // -------------------------------------------------------------------
  return {
    init,
    loadNote,
    clearEditor,
    refresh,
  };
})();
