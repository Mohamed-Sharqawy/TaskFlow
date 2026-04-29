"""
NoteManager — Note CRUD Operations
======================================
Handles all note business logic. Uses JsonStorage for
persistence, helpers for utilities, and validators for input checks.
"""

import uuid

from utils.helpers import make_response, utc_timestamp
from utils.validators import validate_note_title, validate_user_id


class NoteManager:
    """Manages CRUD operations for notes.

    Attributes:
        storage: A JsonStorage instance for data persistence.
    """

    def __init__(self, storage):
        """Initialize with a JsonStorage instance.

        Args:
            storage: The JsonStorage instance to use for reads/writes.
        """
        self.storage = storage

    # -------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------

    def _find_note(self, data, note_id):
        """Locate a note by its UUID string ID.

        Args:
            data: The full notes data store dict.
            note_id: The UUID string.

        Returns:
            dict or None: The note dict if found, otherwise None.
        """
        for note in data["notes"]:
            if note["id"] == note_id:
                return note
        return None

    # -------------------------------------------------------------------
    # CRUD Operations
    # -------------------------------------------------------------------

    def get_notes(self, user_id):
        """Return all notes for a user, newest first.

        Args:
            user_id: The integer user ID.

        Returns:
            dict: Standardized response with the notes list on success.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()

        user_notes = [n for n in data["notes"] if n["user_id"] == user_id]
        # Sort newest first
        user_notes.sort(key=lambda n: n["created_at"], reverse=True)

        return make_response(True, data=user_notes)

    def create_note(self, user_id, title, body=""):
        """Create a new note.

        Args:
            user_id: The integer user ID.
            title: The trimmed note title string.
            body: The HTML body content (default empty).

        Returns:
            dict: Standardized response with the new note dict on success.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        check = validate_note_title(title)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        now = utc_timestamp()

        new_note = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "body": body or "",
            "created_at": now,
            "updated_at": now,
        }

        with self.storage.lock:
            data = self.storage.read()
            data["notes"].append(new_note)
            self.storage.write(data)

        return make_response(True, data=new_note)

    def update_note(self, note_id, user_id, title=None, body=None):
        """Update an existing note's title and/or body.

        Args:
            note_id: The UUID string note ID.
            user_id: The integer user ID (ownership check).
            title: The new title (optional).
            body: The new HTML body (optional).

        Returns:
            dict: Standardized response with the updated note dict on success.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()
            note = self._find_note(data, note_id)

            if not note:
                return make_response(False, error="Note not found.", status=404)

            if note["user_id"] != user_id:
                return make_response(False, error="Unauthorized.", status=403)

            # Update fields if provided
            if title is not None:
                title = title.strip()
                check = validate_note_title(title)
                if not check["success"]:
                    return make_response(False, error=check["error"], status=400)
                note["title"] = title

            if body is not None:
                note["body"] = body

            note["updated_at"] = utc_timestamp()
            self.storage.write(data)

        return make_response(True, data=note)

    def delete_note(self, note_id, user_id):
        """Delete a note by ID.

        Args:
            note_id: The UUID string note ID.
            user_id: The integer user ID (ownership check).

        Returns:
            dict: Standardized response with a success message.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()

            note = self._find_note(data, note_id)
            if not note:
                return make_response(False, error="Note not found.", status=404)

            if note["user_id"] != user_id:
                return make_response(False, error="Unauthorized.", status=403)

            data["notes"] = [n for n in data["notes"] if n["id"] != note_id]
            self.storage.write(data)

        return make_response(True, data="Note deleted.")

    def search_notes(self, user_id, query):
        """Search notes by title substring (case-insensitive).

        Args:
            user_id: The integer user ID.
            query: The search query string.

        Returns:
            dict: Standardized response with matching notes list.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()

        q = (query or "").strip().lower()
        matches = [
            n for n in data["notes"]
            if n["user_id"] == user_id and q in n["title"].lower()
        ]
        matches.sort(key=lambda n: n["created_at"], reverse=True)

        return make_response(True, data=matches)
