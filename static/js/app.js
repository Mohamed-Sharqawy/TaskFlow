
(() => {
  "use strict";

  
  const session = State.getSession();
  if (!session || !session.user_id) {
    window.location.href = "/";
    return;
  }

  const userId = session.user_id;
  const username = session.username;

  
  const AVATARS = [
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect fill='%238b5cf6' width='80' height='80' rx='40'/%3E%3Ctext x='40' y='52' text-anchor='middle' fill='white' font-size='36' font-family='sans-serif'%3E😊%3C/text%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect fill='%2306b6d4' width='80' height='80' rx='40'/%3E%3Ctext x='40' y='52' text-anchor='middle' fill='white' font-size='36' font-family='sans-serif'%3E🚀%3C/text%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect fill='%2322c55e' width='80' height='80' rx='40'/%3E%3Ctext x='40' y='52' text-anchor='middle' fill='white' font-size='36' font-family='sans-serif'%3E🎯%3C/text%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect fill='%23f59e0b' width='80' height='80' rx='40'/%3E%3Ctext x='40' y='52' text-anchor='middle' fill='white' font-size='36' font-family='sans-serif'%3E⚡%3C/text%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect fill='%23ef4444' width='80' height='80' rx='40'/%3E%3Ctext x='40' y='52' text-anchor='middle' fill='white' font-size='36' font-family='sans-serif'%3E🔥%3C/text%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect fill='%23ec4899' width='80' height='80' rx='40'/%3E%3Ctext x='40' y='52' text-anchor='middle' fill='white' font-size='36' font-family='sans-serif'%3E💎%3C/text%3E%3C/svg%3E",
  ];

  
  const $ = (sel) => document.querySelector(sel);
  const userNameEl = $("#user-name");
  const userAvatarEl = $("#user-avatar");
  const logoutBtn = $("#logout-btn");
  const searchInput = $("#search-input");
  const filterSelect = $("#filter-select");
  const sortSelect = $("#sort-select");
  const newCardInput = $("#new-card-input");
  const addCardBtn = $("#add-card-btn");
  const deleteAllBtn = $("#delete-all-btn");
  const cardGrid = $("#card-grid");
  const toastContainer = $("#toast-container");
  const statCards = $("#stat-cards");
  const statTasks = $("#stat-tasks");
  const statDone = $("#stat-done");
  const statPending = $("#stat-pending");

  
  let cards = [];

  
  function init() {
    
    userNameEl.textContent = username;
    const avatarImg = document.createElement("img");
    avatarImg.src = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    avatarImg.alt = "Avatar";
    userAvatarEl.appendChild(avatarImg);

    
    searchInput.value = State.getSearch();
    filterSelect.value = State.getFilter();
    sortSelect.value = State.getSort();
    newCardInput.value = State.getNewCardDraft();

    
    logoutBtn.addEventListener("click", handleLogout);
    addCardBtn.addEventListener("click", handleAddCard);
    newCardInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleAddCard(); });
    newCardInput.addEventListener("input", () => State.saveNewCardDraft(newCardInput.value));
    searchInput.addEventListener("input", debounce(() => { State.saveSearch(searchInput.value); renderCards(); }, 250));
    filterSelect.addEventListener("change", () => { State.saveFilter(filterSelect.value); renderCards(); });
    sortSelect.addEventListener("change", () => { State.saveSort(sortSelect.value); renderCards(); });
    deleteAllBtn.addEventListener("click", handleDeleteAll);

    
    loadCards();
  }

  
  async function loadCards() {
    try {
      const data = await API.getCards(userId);
      cards = data.cards || [];
      renderCards();
    } catch (err) {
      toast("Failed to load cards: " + err, "error");
    }
  }

  
  function renderCards() {
    const query = searchInput.value.trim().toLowerCase();
    const filter = filterSelect.value;
    const sort = sortSelect.value;

    let filtered = [...cards];

    
    if (query) {
      filtered = filtered.filter((card) => {
        const titleMatch = card.title.toLowerCase().includes(query);
        const taskMatch = card.tasks.some((t) => t.text.toLowerCase().includes(query));
        return titleMatch || taskMatch;
      });
    }

    
    if (filter === "completed") {
      filtered = filtered.filter((c) => c.tasks.some((t) => t.completed));
    } else if (filter === "pending") {
      filtered = filtered.filter((c) => c.tasks.some((t) => !t.completed));
    }

    
    if (sort === "newest") {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sort === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    
    updateStats();

    
    if (filtered.length === 0) {
      cardGrid.innerHTML = `
        <div class="col-12 text-center text-muted p-5">
          <div class="display-1 opacity-50 mb-3">📭</div>
          <h3 class="fw-bold">${query || filter !== "all" ? "No matching cards" : "No cards yet"}</h3>
          <p>${query || filter !== "all" ? "Try adjusting your search or filters." : "Create your first card above to get started!"}</p>
        </div>`;
      return;
    }

    cardGrid.innerHTML = "";
    const editingState = State.getEditing();

    filtered.forEach((card, i) => {
      const el = buildCardElement(card, query, editingState);
      el.style.animationDelay = `${i * 0.06}s`;
      cardGrid.appendChild(el);
    });
  }

  function buildCardElement(card, query, editingState) {
    const div = document.createElement("div");
    div.className = "col-md-6 col-xl-4";
    div.dataset.cardId = card.id;

    const dateStr = new Date(card.created_at).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    // Check if title is being edited
    const isEditingTitle = editingState && editingState.type === "title" && editingState.card_id === card.id;
    const titleHTML = isEditingTitle
      ? `<input class="form-control form-control-sm inline-edit-input w-100" id="edit-title-${card.id}" value="${escapeAttr(editingState.tempText || card.title)}" data-card-id="${card.id}" data-type="title">`
      : `<h5 class="card-title fw-bold m-0 flex-grow-1" style="cursor: pointer; word-break: break-word;" data-card-id="${card.id}">${highlight(escapeHTML(card.title), query)}</h5>`;

    let tasksHTML = "";
    card.tasks.forEach((task, idx) => {
      const isEditingTask = editingState && editingState.type === "task" && editingState.card_id === card.id && editingState.task_index === idx;
      const textContent = isEditingTask
        ? `<input class="form-control form-control-sm inline-edit-input flex-grow-1" id="edit-task-${card.id}-${idx}" value="${escapeAttr(editingState.tempText || task.text)}" data-card-id="${card.id}" data-task-index="${idx}" data-type="task">`
        : `<span class="task-text ms-2 flex-grow-1 ${task.completed ? "completed text-muted text-decoration-line-through" : ""}" data-card-id="${card.id}" data-task-index="${idx}">${highlight(escapeHTML(task.text), query)}</span>`;

      tasksHTML += `
        <li class="list-group-item d-flex align-items-center px-0 bg-transparent border-bottom-0">
          <input type="checkbox" class="task-checkbox flex-shrink-0" data-card-id="${card.id}" data-task-index="${idx}" ${task.completed ? "checked" : ""}>
          ${textContent}
          <div class="task-actions ms-2">
            <button class="btn btn-sm btn-outline-secondary border-0 p-1" data-action="edit-task" data-card-id="${card.id}" data-task-index="${idx}" title="Edit">✏️</button>
            <button class="btn btn-sm btn-outline-danger border-0 p-1" data-action="delete-task" data-card-id="${card.id}" data-task-index="${idx}" title="Delete">🗑️</button>
          </div>
        </li>`;
    });

    const draftValue = State.getDraft(card.id);

    div.innerHTML = `
      <div class="card h-100 shadow-sm border-0">
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-start justify-content-between mb-1">
            ${titleHTML}
            <button class="btn btn-sm btn-outline-danger border-0 ms-2" data-action="delete-card" data-card-id="${card.id}" title="Delete Card">✖</button>
          </div>
          <div class="text-muted small mb-3">${dateStr}</div>
          <ul class="list-group list-group-flush mb-3 flex-grow-1">${tasksHTML}</ul>
          <div class="input-group input-group-sm mt-auto">
            <input type="text" class="form-control" placeholder="Add a task..." data-draft-card="${card.id}" value="${escapeAttr(draftValue)}">
            <button class="btn btn-outline-primary fw-bold" data-action="add-task" data-card-id="${card.id}">+ Add</button>
          </div>
        </div>
        <div class="card-footer bg-transparent border-top d-flex gap-2 p-3">
          <button class="btn btn-sm btn-success fw-bold flex-grow-1" data-action="complete-all" data-card-id="${card.id}">✅ All Done</button>
          <button class="btn btn-sm btn-outline-danger fw-bold flex-grow-1" data-action="delete-completed" data-card-id="${card.id}">🧹 Clear Done</button>
        </div>
      </div>`;

    return div;
  }

  function updateStats() {
    let totalTasks = 0, done = 0, pending = 0;
    cards.forEach((c) => {
      totalTasks += c.tasks.length;
      c.tasks.forEach((t) => { t.completed ? done++ : pending++; });
    });
    animateCounter(statCards, cards.length);
    animateCounter(statTasks, totalTasks);
    animateCounter(statDone, done);
    animateCounter(statPending, pending);
  }

  function animateCounter(el, target) {
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;
    el.textContent = target;
    el.style.transform = "scale(1.3)";
    setTimeout(() => { el.style.transform = "scale(1)"; el.style.transition = "transform 0.3s ease"; }, 50);
  }

  
  cardGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (btn) {
      const action = btn.dataset.action;
      const cardId = parseInt(btn.dataset.cardId);
      const taskIndex = btn.dataset.taskIndex !== undefined ? parseInt(btn.dataset.taskIndex) : null;

      if (action === "delete-card") handleDeleteCard(cardId);
      else if (action === "add-task") handleAddTask(cardId);
      else if (action === "edit-task") startEditTask(cardId, taskIndex);
      else if (action === "delete-task") handleDeleteTask(cardId, taskIndex);
      else if (action === "complete-all") handleBulkAction(cardId, "complete_all");
      else if (action === "delete-completed") handleBulkAction(cardId, "delete_completed");
      return;
    }

    
    const titleEl = e.target.closest(".card-title");
    if (titleEl) {
      startEditTitle(parseInt(titleEl.dataset.cardId));
      return;
    }

    
    const taskTextEl = e.target.closest(".task-text");
    if (taskTextEl) {
      startEditTask(parseInt(taskTextEl.dataset.cardId), parseInt(taskTextEl.dataset.taskIndex));
    }
  });

  
  cardGrid.addEventListener("change", (e) => {
    if (e.target.classList.contains("task-checkbox")) {
      const cardId = parseInt(e.target.dataset.cardId);
      const taskIndex = parseInt(e.target.dataset.taskIndex);
      handleToggleTask(cardId, taskIndex, e.target.checked);
    }
  });

  
  cardGrid.addEventListener("input", (e) => {
    if (e.target.dataset.draftCard) {
      State.saveDraft(parseInt(e.target.dataset.draftCard), e.target.value);
    }
    
    if (e.target.classList.contains("inline-edit-input")) {
      const cardId = parseInt(e.target.dataset.cardId);
      const type = e.target.dataset.type;
      const taskIndex = e.target.dataset.taskIndex !== undefined ? parseInt(e.target.dataset.taskIndex) : null;
      State.saveEditing({ card_id: cardId, task_index: taskIndex, tempText: e.target.value, type });
    }
  });

  
  cardGrid.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (e.target.dataset.draftCard) {
        handleAddTask(parseInt(e.target.dataset.draftCard));
      }
      if (e.target.classList.contains("inline-edit-input")) {
        e.target.blur(); // triggers save via focusout
      }
    }
    if (e.key === "Escape" && e.target.classList.contains("inline-edit-input")) {
      State.clearEditing();
      renderCards();
    }
  });

  // Save inline edits on blur
  cardGrid.addEventListener("focusout", (e) => {
    if (e.target.classList.contains("inline-edit-input")) {
      const type = e.target.dataset.type;
      const cardId = parseInt(e.target.dataset.cardId);
      const newValue = e.target.value.trim();

      if (type === "title" && newValue) {
        commitEditTitle(cardId, newValue);
      } else if (type === "task") {
        const taskIndex = parseInt(e.target.dataset.taskIndex);
        if (newValue) commitEditTask(cardId, taskIndex, newValue);
        else State.clearEditing();
      } else {
        State.clearEditing();
        renderCards();
      }
    }
  });

  
  async function handleAddCard() {
    const title = newCardInput.value.trim();
    if (!title) { toast("Please enter a card title.", "error"); return; }
    try {
      const data = await API.createCard(userId, title);
      cards.push(data.card);
      newCardInput.value = "";
      State.clearNewCardDraft();
      renderCards();
      toast("Card created!", "success");
    } catch (err) { toast(err, "error"); }
  }

  async function handleDeleteCard(cardId) {
    if (!confirm("Delete this card and all its tasks?")) return;
    try {
      await API.deleteCard(userId, cardId);
      cards = cards.filter((c) => c.id !== cardId);
      State.clearDraft(cardId);
      renderCards();
      toast("Card deleted.", "success");
    } catch (err) { toast(err, "error"); }
  }

  async function handleDeleteAll() {
    if (!confirm("Delete ALL cards? This cannot be undone.")) return;
    try {
      await API.deleteAllCards(userId);
      cards = [];
      renderCards();
      toast("All cards deleted.", "success");
    } catch (err) { toast(err, "error"); }
  }


  async function handleAddTask(cardId) {
    const input = cardGrid.querySelector(`input[data-draft-card="${cardId}"]`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    try {
      const data = await API.addTask(userId, cardId, text);
      updateLocalCard(cardId, data.card);
      State.clearDraft(cardId);
      renderCards();
      toast("Task added!", "success");
    } catch (err) { toast(err, "error"); }
  }

  async function handleToggleTask(cardId, taskIndex, completed) {
    try {
      const data = await API.updateTask(userId, cardId, taskIndex, { completed });
      updateLocalCard(cardId, data.card);
      renderCards();
    } catch (err) { toast(err, "error"); loadCards(); }
  }

  async function handleDeleteTask(cardId, taskIndex) {
    try {
      const data = await API.deleteTask(userId, cardId, taskIndex);
      updateLocalCard(cardId, data.card);
      renderCards();
      toast("Task removed.", "success");
    } catch (err) { toast(err, "error"); }
  }

  async function handleBulkAction(cardId, action) {
    try {
      const data = await API.bulkTaskAction(userId, cardId, action);
      updateLocalCard(cardId, data.card);
      renderCards();
      toast(action === "complete_all" ? "All tasks marked done!" : "Completed tasks cleared!", "success");
    } catch (err) { toast(err, "error"); }
  }

  
  function startEditTitle(cardId) {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    State.saveEditing({ card_id: cardId, tempText: card.title, type: "title" });
    renderCards();
    setTimeout(() => {
      const inp = document.getElementById(`edit-title-${cardId}`);
      if (inp) { inp.focus(); inp.select(); }
    }, 50);
  }

  async function commitEditTitle(cardId, newTitle) {
    State.clearEditing();
    try {
      const data = await API.updateCard(userId, cardId, newTitle);
      updateLocalCard(cardId, data.card);
      renderCards();
      toast("Title updated.", "success");
    } catch (err) { toast(err, "error"); renderCards(); }
  }

  function startEditTask(cardId, taskIndex) {
    const card = cards.find((c) => c.id === cardId);
    if (!card || !card.tasks[taskIndex]) return;
    State.saveEditing({ card_id: cardId, task_index: taskIndex, tempText: card.tasks[taskIndex].text, type: "task" });
    renderCards();
    setTimeout(() => {
      const inp = document.getElementById(`edit-task-${cardId}-${taskIndex}`);
      if (inp) { inp.focus(); inp.select(); }
    }, 50);
  }

  async function commitEditTask(cardId, taskIndex, newText) {
    State.clearEditing();
    try {
      const data = await API.updateTask(userId, cardId, taskIndex, { text: newText });
      updateLocalCard(cardId, data.card);
      renderCards();
      toast("Task updated.", "success");
    } catch (err) { toast(err, "error"); renderCards(); }
  }

  
  function handleLogout() {
    State.clearAll();
    window.location.href = "/";
  }

  
  function updateLocalCard(cardId, updatedCard) {
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx !== -1) cards[idx] = updatedCard;
  }

  function escapeHTML(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlight(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

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

  
  init();
})();
