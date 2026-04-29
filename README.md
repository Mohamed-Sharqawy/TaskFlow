# MY FINAL PROJECT

Comfort Zone is a full-stack productivity web application that combines card-based task management, a Pomodoro timer synchronized with a video player, and a rich-text notes editor — all in one distraction-free workspace.
New feature: A Pomodoro timer that automatically plays and pauses a YouTube or MP4 video player based on work/break session state, using timestamp-based timing (not a simple counter) for accuracy across page reloads.

## Prerequisites
Only one additional package is needed beyond the Python standard library:
```bash
   pip install flask
```
Project Checklist

[X] Available on GitHub.
https://github.com/Mohamed-Sharqawy/TaskFlow

[X] Uses the Flask web framework.
app.py creates the Flask instance,
defines all routes,
and serves Jinja2 templates.

[X] Uses at least one module from the Python Standard Library other than random.

Module name: threading — used in (services/json_storage.py) via (threading.Lock())
to make all file reads and writes thread-safe under Flask's multi-threaded server.
Also uses: (json, os, uuid, datetime (all stdlib)).


[X] Contains at least one class written by you that has both properties and methods.

File name for the class definition: (models/card_manager.py)

Line number(s) for the class definition: Line 1 (class CardManager)

Name of two properties: self.storage (the injected JsonStorage instance)

Name of two methods: create_card(), add_task()

File name and line numbers where the methods are used: app.py — (create_card()) is called on line ~107 inside create_card

route; add_task() is called on line ~127 inside add_task route.

Additional classes also qualify:

JsonStorage in services/json_storage.py — properties: self.filepath, self.lock; methods: read(), write()

NoteManager in models/note_manager.py — properties: self.storage; methods: create_note(), search_notes()

UserManager in models/user_manager.py — properties: self.storage; methods: register(), login()


[X] Makes use of JavaScript in the front end and uses localStorage of the web browser.

(static/js/state.js) is entirely dedicated to localStorage management (session, filters, drafts, editing state).

static/js/pomodoro.js persists timer state under key "cz_timer". static/js/video_player.js persists video URL and playback 

position under "cz_video". static/js/theme.js persists the theme preference under "theme".

[X] Uses modern JavaScript (let and const rather than var).

All nine JS files use "use strict", const, let, async/await, arrow functions, spread operators, and template literals 

throughout. Example: static/js/pomodoro.js line 1 — const Pomodoro = (() => { ... })();

[X] Makes use of reading and writing to the same file.

services/json_storage.py — read() reads from and write() writes back to the exact same file path (data/users.json or data/notes.json). Every mutation (create card, update task, delete note, etc.) performs a read-then-write cycle on the same file, protected by threading.Lock().

[X] Contains conditional statements.

File name: models/card_manager.py

Line number(s): The bulk_task_action method — if action == "complete_all": / elif action == "delete_completed":. Also throughout all manager methods: if not check["success"]: return ..., if not user:, if task_index < 0 or task_index >= len(card["tasks"]):.

Additional example — File name: static/js/pomodoro.js — if (s.mode === "work") inside handleTimerEnd().


[X] Contains loops.

File name: utils/helpers.py
Line number(s): find_user_by_id() — for user in data["users"]: loop; find_card() — for card in user["cards"]: loop; next_card_id() — generator expression loop.
Additional example — File name: models/card_manager.py — bulk_task_action method: for task in card["tasks"]: 

task["completed"] = True.


[X] Lets the user enter a value in a text box at some point, received and processed by the back end Python code.
Multiple text inputs feed the backend:

The username/password fields on login and register pages → processed by UserManager.login() / UserManager.register() in Python.
The "New card title" input → processed by CardManager.create_card().

The "Add a task" input → processed by CardManager.add_task().

The note title/body inputs → processed by NoteManager.create_note() / NoteManager.update_note().


[X] Doesn't generate any error message even if the user enters wrong input.

All inputs are validated by utils/validators.py before any data operation. Invalid input returns a JSON error response {"error": "..."} which the JavaScript catches in a try/catch block and displays via Bootstrap Toast notifications or SweetAlert2 dialogs — never a raw error page or console output visible to the user.

[X] Styled using your own CSS.
Three custom stylesheets are written from scratch:

static/css/style.css — global styles, light/dark mode, custom task checkboxes, search highlight marks.
static/css/comfort_zone.css — SVG timer ring animation, video wrapper aspect-ratio, notes editor contenteditable styling.
static/css/notes.css — full-page notes layout overrides.


[X] Code follows conventions, is fully documented using comments, and doesn't contain unused or experimental code.

Every Python module has a docstring at the top. Every class and every method has a Google-style docstring with Args: and Returns:.
Every JavaScript file has a header comment explaining its role. Major functions have inline comments explaining logic.
No print() statements exist in any Python file. No console.log() calls exist in any JavaScript file. All user feedback is delivered via Bootstrap Toasts or SweetAlert2 dialogs rendered in the browser.


