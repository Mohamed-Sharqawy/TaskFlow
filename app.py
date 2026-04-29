"""
Card-Based Task Management System — Flask Backend
===================================================
Thin route layer. All business logic is delegated to modular classes:
  - JsonStorage  → JSON file I/O
  - AuthService  → Login / Registration
  - CardManager  → Card & Task CRUD
"""

import os

from flask import Flask, jsonify, render_template, request

from models.card_manager import CardManager
from models.note_manager import NoteManager
from models.user_manager import UserManager
from services.auth_service import AuthService
from services.json_storage import JsonStorage

# ---------------------------------------------------------------------------
# App Configuration
# ---------------------------------------------------------------------------
app = Flask(__name__)

# Path to the JSON data file
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "users.json")
NOTES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "notes.json")

# Initialize services and managers
storage = JsonStorage(DATA_FILE)
notes_storage = JsonStorage(NOTES_FILE, default_data={"notes": [], "last_note_id": 0})
user_manager = UserManager(storage)
card_manager = CardManager(storage)
note_manager = NoteManager(notes_storage)
auth_service = AuthService(user_manager)


# ---------------------------------------------------------------------------
# Helper — translate internal result dicts into Flask JSON responses
# ---------------------------------------------------------------------------

def api_response(result, success_key=None, success_status=200):
    """Convert an internal result dict into a Flask JSON response.

    Args:
        result: Dict with ``success``, ``data``, ``error``, and optional ``status``.
        success_key: If set, wrap ``result["data"]`` under this key in the response.
        success_status: HTTP status code for successful responses.

    Returns:
        Flask Response tuple (json, status_code).
    """
    if not result["success"]:
        return jsonify({"error": result["error"]}), result.get("status", 400)

    if success_key:
        return jsonify({success_key: result["data"]}), success_status
    return jsonify(result["data"]), success_status


# ---------------------------------------------------------------------------
# Page Routes (serve HTML templates)
# ---------------------------------------------------------------------------

@app.route("/")
def login_page():
    """Serve the login page (default entry point)."""
    return render_template("login.html")


@app.route("/register")
def register_page():
    """Serve the registration page."""
    return render_template("register.html")


@app.route("/dashboard")
def dashboard_page():
    """Serve the main dashboard page."""
    return render_template("dashboard.html")


@app.route("/comfort-zone")
def comfort_zone_page():
    """Serve the Comfort Zone productivity page."""
    return render_template("comfort_zone.html")


@app.route("/notes")
def notes_page():
    """Serve the Notes management page."""
    return render_template("notes.html")


# ---------------------------------------------------------------------------
# Authentication API
# ---------------------------------------------------------------------------

@app.route("/api/login", methods=["POST"])
def api_login():
    """Validate user credentials and return user info."""
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    result = auth_service.login(username, password)
    return api_response(result)


@app.route("/api/register", methods=["POST"])
def api_register():
    """Register a new user and return user info."""
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    result = auth_service.register(username, password)
    return api_response(result, success_status=201)


# ---------------------------------------------------------------------------
# Cards API
# ---------------------------------------------------------------------------

@app.route("/api/cards", methods=["GET"])
def get_cards():
    """Return all cards for the authenticated user."""
    user_id = request.args.get("user_id", type=int)
    result = card_manager.get_cards(user_id)
    return api_response(result, success_key="cards")


@app.route("/api/cards", methods=["POST"])
def create_card():
    """Create a new card for the user."""
    body = request.get_json(silent=True) or {}
    result = card_manager.create_card(
        body.get("user_id"),
        (body.get("title") or "").strip(),
    )
    return api_response(result, success_key="card", success_status=201)


@app.route("/api/cards/<int:card_id>", methods=["PUT"])
def update_card(card_id):
    """Update a card's title."""
    body = request.get_json(silent=True) or {}
    result = card_manager.update_card(
        body.get("user_id"),
        card_id,
        (body.get("title") or "").strip(),
    )
    return api_response(result, success_key="card")


@app.route("/api/cards/<int:card_id>", methods=["DELETE"])
def delete_card(card_id):
    """Delete a card."""
    body = request.get_json(silent=True) or {}
    result = card_manager.delete_card(body.get("user_id"), card_id)
    if not result["success"]:
        return jsonify({"error": result["error"]}), result.get("status", 400)
    return jsonify({"message": result["data"]}), 200


@app.route("/api/cards/bulk-delete", methods=["POST"])
def bulk_delete_cards():
    """Delete ALL cards for a user."""
    body = request.get_json(silent=True) or {}
    result = card_manager.bulk_delete_cards(body.get("user_id"))
    if not result["success"]:
        return jsonify({"error": result["error"]}), result.get("status", 400)
    return jsonify({"message": result["data"]}), 200


# ---------------------------------------------------------------------------
# Tasks API
# ---------------------------------------------------------------------------

@app.route("/api/cards/<int:card_id>/tasks", methods=["POST"])
def add_task(card_id):
    """Add a task to a card."""
    body = request.get_json(silent=True) or {}
    result = card_manager.add_task(
        body.get("user_id"),
        card_id,
        (body.get("text") or "").strip(),
    )
    return api_response(result, success_key="card", success_status=201)


@app.route("/api/cards/<int:card_id>/tasks/<int:task_index>", methods=["PUT"])
def update_task(card_id, task_index):
    """Update a task's text or completion status."""
    body = request.get_json(silent=True) or {}
    result = card_manager.update_task(
        body.get("user_id"),
        card_id,
        task_index,
        body,
    )
    return api_response(result, success_key="card")


@app.route("/api/cards/<int:card_id>/tasks/<int:task_index>", methods=["DELETE"])
def delete_task(card_id, task_index):
    """Delete a task from a card."""
    body = request.get_json(silent=True) or {}
    result = card_manager.delete_task(
        body.get("user_id"), card_id, task_index
    )
    return api_response(result, success_key="card")


@app.route("/api/cards/<int:card_id>/tasks/bulk", methods=["POST"])
def bulk_task_action(card_id):
    """Bulk task operations on a card."""
    body = request.get_json(silent=True) or {}
    result = card_manager.bulk_task_action(
        body.get("user_id"), card_id, body.get("action")
    )
    return api_response(result, success_key="card")


# ---------------------------------------------------------------------------
# Notes API
# ---------------------------------------------------------------------------

@app.route("/api/notes", methods=["GET"])
def get_notes():
    """Return all notes for the authenticated user."""
    user_id = request.args.get("user_id", type=int)
    result = note_manager.get_notes(user_id)
    return api_response(result, success_key="notes")


@app.route("/api/notes", methods=["POST"])
def create_note():
    """Create a new note."""
    body = request.get_json(silent=True) or {}
    result = note_manager.create_note(
        body.get("user_id"),
        (body.get("title") or "").strip(),
        body.get("body", ""),
    )
    return api_response(result, success_key="note", success_status=201)


@app.route("/api/notes/<note_id>", methods=["PUT"])
def update_note(note_id):
    """Update a note's title and/or body."""
    body = request.get_json(silent=True) or {}
    result = note_manager.update_note(
        note_id,
        body.get("user_id"),
        body.get("title"),
        body.get("body"),
    )
    return api_response(result, success_key="note")


@app.route("/api/notes/<note_id>", methods=["DELETE"])
def delete_note(note_id):
    """Delete a note."""
    body = request.get_json(silent=True) or {}
    result = note_manager.delete_note(note_id, body.get("user_id"))
    if not result["success"]:
        return jsonify({"error": result["error"]}), result.get("status", 400)
    return jsonify({"message": result["data"]}), 200


@app.route("/api/notes/search", methods=["GET"])
def search_notes():
    """Search notes by title."""
    user_id = request.args.get("user_id", type=int)
    q = request.args.get("q", "")
    result = note_manager.search_notes(user_id, q)
    return api_response(result, success_key="notes")


# ---------------------------------------------------------------------------
# Run Server
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    storage.ensure_file_exists()
    notes_storage.ensure_file_exists()
    app.run(debug=True, port=5000)
