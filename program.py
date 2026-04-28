import os

from flask import Flask, jsonify, render_template, request

from models.card_manger import CardManager
from models.note_manager import NoteManager
from models.user_manager import UserManager
from services.auth_service import AuthService
from services.json_storage import JsonStorage

app = Flask(__name__)

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "users.json")
NOTES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "notes.json")

storage = JsonStorage(DATA_FILE)
notes_storage = JsonStorage(NOTES_FILE, default_data={"notes":[], "last_note_id":0})
user_manager = UserManager(storage)
card_manager = CardManager(storage)
notes_manager = NoteManager(notes_storage)
auth_srevice = AuthService(user_manager)

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

def api_response(result, success_key=None, success_status=200):
    
    if not result["success"]:
        return jsonify({"error": result["error"]}), result.get("status", 400)
    
    if success_key:
        return jsonify({success_key:result["data"]}), success_status
    
    return jsonify(result["data"]), success_status


@app.route("/api/login", methods=["POST"])
def api_login():
    
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    
    result = auth_srevice.login(username, password)
    return api_response(result)

@app.route("/api/register", methods=["POST"])
def api_register():
    
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    
    result = auth_srevice.register(username, password)
    return api_response(result, success_status=201)


@app.route("/api/cards", methods=["GET"])
def get_cards():
    
    user_id = request.args.get("user_id", type=int)
    result = card_manager.get_cards(user_id)
    return api_response(result, success_key="cards")

@app.route("/api/cards", methods=["POST"])
def create_card():
    
    body = request.get_json(silent=True)
    result = card_manager.create_card(
        body.get("user_id"),
        (body.get("title") or "").strip(),
    )
    return api_response(result, success_key="card", success_status=201)

@app.route("/api/cards/<int:card_id>",methods=["PUT"])
def update_card(card_id):
    body = request.get_json(silent=True) or {}
    result = card_manager.update_card(
        body.get("user_id"),
        card_id,
        (body.get("title") or "").strip(),
    )
    return api_response(result, success_key="card")

@app.route("/api/cards/<int:card_id>", methods=["DELETE"])
def delete_card(card_id):
    
    body = request.get_json(silent=True) or {}
    result = card_manager.delete_card(body.get("user_id"), card_id)
    if not result["success"]:
        return jsonify({"error": result["error"]}), result.get("status", 400)
    return jsonify({"message": result["data"]}), 200

@app.route("/api/cards/bulk-delete", methods=["POST"])
def bulk_delete_cards():
    
    body = request.get_json(silent=True) or {}
    result = card_manager.bulk_delete_cards(body.get("user_id"))
    if not result["success"]:
        return jsonify({"error": result["error"]}) , result.get("status", 400)
    return jsonify({"message": result["data"]}) , 200

@app.route("/api/cards/<int:card_id>/tasks", methods=["POST"])
def add_task(card_id):
    
    body = request.get_json(silent=True)
    result = card_manager.add_task(
        body.get("user_id"),
        card_id,
        (body.get("body") or "").strip(),
    )
    return api_response(result, success_key="card", success_status=201)

@app.route("/api/cards/<int:card_id>/tasks/<int:task_index>", methods=["PUT"])
def update_task(card_id, task_index):
    
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
    
    body = request.get_json(silent=True) or {}
    result = card_manager.delete_task(
        body.get("user_id"), card_id, task_index
    )
    return api_response(result, success_key="card")

@app.route("/api/cards/<int:card_id>/tasks/bulk", methods=["DELETE"])
def bulk_task_action(card_id):
    body = request.get_json(silent=True) or {}
    result = card_manager.bulk_task_action(
        body.get("user_id"), card_id, body.get("action")
    )
    return api_response(result, success_key="card")

@app.route("/api/notes", methods=["GET"])
def get_notes():
    
    user_id = request.args.get("user_id", type=int)
    result = notes_manager.get_notes(user_id)
    return api_response(result, success_key="notes")

@app.route("/api/notes", methods=["POST"])
def create_note():
    
    body = request.get_json(silent=True) or {} 
    result = notes_manager.create_notes(
        body.get("user_id"),
        (body.get("title") or "").strip(),
        body.get("body", ""),
    )
    return api_response(result, success_key="note", success_status=201)

@app.route("/api/notes/<note_id>", methods=["PUT"])
def update_note(note_id):
    
    body = request.get_json(silent=True) or {}
    result = notes_manager.update_note(
        note_id,
        body.get("user_id"),
        body.get("title"),
        body.get("body"),
    )
    return api_response(result, success_key="note")

@app.route("/api/notes/<note_id>", methods=["DELETE"])
def delete_note(note_id):
    
    body = request.get_json(silent=True) or {}
    result = notes_manager.delete_note(note_id, body.get("user_id"))
    if not result["success"]:
        return jsonify({"error": result["error"]}), result.get("status", 400)
    return jsonify({"message":result["data"]}), 200

@app.route("/api/notes/search", methods=["GET"])
def search_notes():
    
    user_id = request.args.get("user_id", type=int)
    q = request.args.get("q", "")
    result = notes_manager.search_notes(user_id, q)
    return api_response(result, success_key="notes")


if __name__ == "__main__":
    storage.ensure_file_existance()
    notes_storage.ensure_file_existance()
    app.run(debug=True, port=5000)

