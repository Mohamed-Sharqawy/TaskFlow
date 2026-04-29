/**
 * api.js — API Client Module
 * Thin wrapper around fetch() for all backend API calls.
 */
const API = (() => {
  async function request(url, options = {}) {
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
      const data = await res.json();
      if (!res.ok) throw data.error || "An unexpected error occurred.";
      return data;
    } catch (err) {
      if (typeof err === "string") throw err;
      throw "Network error. Please check your connection.";
    }
  }

  return {
    login: (u, p) => request("/api/login", { method: "POST", body: JSON.stringify({ username: u, password: p }) }),
    register: (u, p) => request("/api/register", { method: "POST", body: JSON.stringify({ username: u, password: p }) }),
    getCards: (uid) => request(`/api/cards?user_id=${uid}`),
    createCard: (uid, title) => request("/api/cards", { method: "POST", body: JSON.stringify({ user_id: uid, title }) }),
    updateCard: (uid, cid, title) => request(`/api/cards/${cid}`, { method: "PUT", body: JSON.stringify({ user_id: uid, title }) }),
    deleteCard: (uid, cid) => request(`/api/cards/${cid}`, { method: "DELETE", body: JSON.stringify({ user_id: uid }) }),
    deleteAllCards: (uid) => request("/api/cards/bulk-delete", { method: "POST", body: JSON.stringify({ user_id: uid }) }),
    addTask: (uid, cid, text) => request(`/api/cards/${cid}/tasks`, { method: "POST", body: JSON.stringify({ user_id: uid, text }) }),
    updateTask: (uid, cid, idx, updates) => request(`/api/cards/${cid}/tasks/${idx}`, { method: "PUT", body: JSON.stringify({ user_id: uid, ...updates }) }),
    deleteTask: (uid, cid, idx) => request(`/api/cards/${cid}/tasks/${idx}`, { method: "DELETE", body: JSON.stringify({ user_id: uid }) }),
    bulkTaskAction: (uid, cid, action) => request(`/api/cards/${cid}/tasks/bulk`, { method: "POST", body: JSON.stringify({ user_id: uid, action }) }),

    // Notes API
    getNotes: (uid) => request(`/api/notes?user_id=${uid}`),
    createNote: (uid, title, body) => request("/api/notes", { method: "POST", body: JSON.stringify({ user_id: uid, title, body }) }),
    updateNote: (id, uid, title, body) => request(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify({ user_id: uid, title, body }) }),
    deleteNote: (id, uid) => request(`/api/notes/${id}`, { method: "DELETE", body: JSON.stringify({ user_id: uid }) }),
    searchNotes: (uid, q) => request(`/api/notes/search?user_id=${uid}&q=${encodeURIComponent(q)}`),
  };
})();
