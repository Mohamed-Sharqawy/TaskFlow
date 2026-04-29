/**
 * state.js — localStorage Helper Module
 * ========================================
 * Manages all UI state persistence via localStorage.
 * NEVER stores backend data — only session info, filters, drafts, and editing state.
 */

const State = (() => {

  // -----------------------------------------------------------------------
  // Key Constants
  // -----------------------------------------------------------------------
  const KEYS = {
    SESSION: "taskapp_session",        // { username, user_id }
    FILTER: "taskapp_filter",          // "all" | "completed" | "pending"
    SORT: "taskapp_sort",              // "newest" | "oldest" | "title"
    SEARCH: "taskapp_search",          // search query string
    DRAFTS: "taskapp_drafts",          // { [card_id]: "draft text" }
    NEW_CARD_DRAFT: "taskapp_new_card",// draft title for new card
    EDITING: "taskapp_editing",        // { card_id, task_index, tempText, type }
  };

  // -----------------------------------------------------------------------
  // Generic Helpers
  // -----------------------------------------------------------------------

  /**
   * Get a parsed JSON value from localStorage.
   * @param {string} key - localStorage key
   * @param {*} fallback - default value if key is missing
   * @returns {*} parsed value or fallback
   */
  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /**
   * Set a value in localStorage as JSON.
   * @param {string} key - localStorage key
   * @param {*} value - value to store
   */
  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable — fail silently
    }
  }

  /**
   * Remove a key from localStorage.
   * @param {string} key - localStorage key
   */
  function remove(key) {
    localStorage.removeItem(key);
  }

  // -----------------------------------------------------------------------
  // Session
  // -----------------------------------------------------------------------

  /** Save the login session. */
  function saveSession(username, userId) {
    set(KEYS.SESSION, { username, user_id: userId });
  }

  /** Get the current session or null. */
  function getSession() {
    return get(KEYS.SESSION, null);
  }

  /** Clear the session (logout). */
  function clearSession() {
    remove(KEYS.SESSION);
  }

  // -----------------------------------------------------------------------
  // Filter
  // -----------------------------------------------------------------------

  /** Save the selected filter. */
  function saveFilter(filter) {
    set(KEYS.FILTER, filter);
  }

  /** Get the current filter. Defaults to "all". */
  function getFilter() {
    return get(KEYS.FILTER, "all");
  }

  // -----------------------------------------------------------------------
  // Sort
  // -----------------------------------------------------------------------

  /** Save the selected sort option. */
  function saveSort(sort) {
    set(KEYS.SORT, sort);
  }

  /** Get the current sort option. Defaults to "newest". */
  function getSort() {
    return get(KEYS.SORT, "newest");
  }

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------

  /** Save the search query. */
  function saveSearch(query) {
    set(KEYS.SEARCH, query);
  }

  /** Get the current search query. */
  function getSearch() {
    return get(KEYS.SEARCH, "");
  }

  // -----------------------------------------------------------------------
  // Drafts (unsaved task text per card)
  // -----------------------------------------------------------------------

  /** Save a draft task text for a specific card. */
  function saveDraft(cardId, text) {
    const drafts = get(KEYS.DRAFTS, {});
    if (text) {
      drafts[cardId] = text;
    } else {
      delete drafts[cardId];
    }
    set(KEYS.DRAFTS, drafts);
  }

  /** Get the draft task text for a specific card. */
  function getDraft(cardId) {
    const drafts = get(KEYS.DRAFTS, {});
    return drafts[cardId] || "";
  }

  /** Clear a draft after successful save. */
  function clearDraft(cardId) {
    saveDraft(cardId, "");
  }

  // -----------------------------------------------------------------------
  // New Card Draft
  // -----------------------------------------------------------------------

  /** Save the draft title for a new card being created. */
  function saveNewCardDraft(text) {
    set(KEYS.NEW_CARD_DRAFT, text);
  }

  /** Get the new card draft title. */
  function getNewCardDraft() {
    return get(KEYS.NEW_CARD_DRAFT, "");
  }

  /** Clear the new card draft. */
  function clearNewCardDraft() {
    remove(KEYS.NEW_CARD_DRAFT);
  }

  // -----------------------------------------------------------------------
  // Editing State
  // -----------------------------------------------------------------------

  /**
   * Save the current editing state.
   * @param {object} state - { card_id, task_index?, tempText, type: "task"|"title" }
   */
  function saveEditing(state) {
    set(KEYS.EDITING, state);
  }

  /** Get the current editing state or null. */
  function getEditing() {
    return get(KEYS.EDITING, null);
  }

  /** Clear editing state after save/cancel. */
  function clearEditing() {
    remove(KEYS.EDITING);
  }

  // -----------------------------------------------------------------------
  // Clear All (for logout)
  // -----------------------------------------------------------------------

  /** Remove ALL app-related localStorage keys. */
  function clearAll() {
    Object.values(KEYS).forEach((key) => remove(key));
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------
  return {
    saveSession,
    getSession,
    clearSession,
    saveFilter,
    getFilter,
    saveSort,
    getSort,
    saveSearch,
    getSearch,
    saveDraft,
    getDraft,
    clearDraft,
    saveNewCardDraft,
    getNewCardDraft,
    clearNewCardDraft,
    saveEditing,
    getEditing,
    clearEditing,
    clearAll,
  };
})();
