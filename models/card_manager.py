"""
CardManager — Card & Task CRUD Operations
============================================
Handles all card and task business logic. Uses JsonStorage for
persistence, helpers for lookups, and validators for input checks.
"""

from utils.helpers import (
    find_card,
    find_user_by_id,
    make_response,
    next_card_id,
    utc_timestamp,
)
from utils.validators import (
    validate_bulk_action,
    validate_card_title,
    validate_task_text,
    validate_user_id,
)


class CardManager:
    """Manages CRUD operations for cards and their tasks.

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

    def _get_user_or_error(self, data, user_id):
        """Locate a user in the data store or return an error response.

        Args:
            data: The full data store dict.
            user_id: The integer user ID.

        Returns:
            tuple: ``(user_dict, None)`` on success, or
                   ``(None, error_response_dict)`` on failure.
        """
        user = find_user_by_id(data, user_id)
        if not user:
            return None, make_response(False, error="User not found.", status=404)
        return user, None

    def _get_card_or_error(self, user, card_id):
        """Locate a card in a user's card list or return an error response.

        Args:
            user: The user dict.
            card_id: The integer card ID.

        Returns:
            tuple: ``(card_dict, None)`` on success, or
                   ``(None, error_response_dict)`` on failure.
        """
        card = find_card(user, card_id)
        if not card:
            return None, make_response(False, error="Card not found.", status=404)
        return card, None

    # -------------------------------------------------------------------
    # Card Operations
    # -------------------------------------------------------------------

    def get_cards(self, user_id):
        """Return all cards for a user.

        Args:
            user_id: The integer user ID.

        Returns:
            dict: Standardized response with the cards list on success.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()
            user, err = self._get_user_or_error(data, user_id)
            if err:
                return err

        return make_response(True, data=user["cards"])

    def create_card(self, user_id, title):
        """Create a new card for a user.

        Args:
            user_id: The integer user ID.
            title: The trimmed card title string.

        Returns:
            dict: Standardized response with the new card dict on success.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        check = validate_card_title(title)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()
            user, err = self._get_user_or_error(data, user_id)
            if err:
                return err

            new_card = {
                "id": next_card_id(user),
                "title": title,
                "created_at": utc_timestamp(),
                "tasks": [],
            }
            user["cards"].append(new_card)
            self.storage.write(data)

        return make_response(True, data=new_card)

    def update_card(self, user_id, card_id, title):
        """Update a card's title.

        Args:
            user_id: The integer user ID.
            card_id: The integer card ID.
            title: The new trimmed title string.

        Returns:
            dict: Standardized response with the updated card dict on success.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        check = validate_card_title(title)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()
            user, err = self._get_user_or_error(data, user_id)
            if err:
                return err

            card, err = self._get_card_or_error(user, card_id)
            if err:
                return err

            card["title"] = title
            self.storage.write(data)

        return make_response(True, data=card)

    def delete_card(self, user_id, card_id):
        """Delete a card by ID.

        Args:
            user_id: The integer user ID.
            card_id: The integer card ID.

        Returns:
            dict: Standardized response with a success message.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()
            user, err = self._get_user_or_error(data, user_id)
            if err:
                return err

            original_len = len(user["cards"])
            user["cards"] = [c for c in user["cards"] if c["id"] != card_id]

            if len(user["cards"]) == original_len:
                return make_response(False, error="Card not found.", status=404)

            self.storage.write(data)

        return make_response(True, data="Card deleted.")

    def bulk_delete_cards(self, user_id):
        """Delete ALL cards for a user.

        Args:
            user_id: The integer user ID.

        Returns:
            dict: Standardized response with a success message.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()
            user, err = self._get_user_or_error(data, user_id)
            if err:
                return err

            user["cards"] = []
            self.storage.write(data)

        return make_response(True, data="All cards deleted.")

    # -------------------------------------------------------------------
    # Task Operations
    # -------------------------------------------------------------------

    def add_task(self, user_id, card_id, text):
        """Add a task to a card.

        Args:
            user_id: The integer user ID.
            card_id: The integer card ID.
            text: The trimmed task text string.

        Returns:
            dict: Standardized response with the updated card dict on success.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        check = validate_task_text(text)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()
            user, err = self._get_user_or_error(data, user_id)
            if err:
                return err

            card, err = self._get_card_or_error(user, card_id)
            if err:
                return err

            new_task = {"text": text, "completed": False}
            card["tasks"].append(new_task)
            self.storage.write(data)

        return make_response(True, data=card)

    def update_task(self, user_id, card_id, task_index, body):
        """Update a task's text and/or completion status.

        Args:
            user_id: The integer user ID.
            card_id: The integer card ID.
            task_index: The zero-based task index.
            body: Dict with optional ``"text"`` and/or ``"completed"`` keys.

        Returns:
            dict: Standardized response with the updated card dict on success.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()
            user, err = self._get_user_or_error(data, user_id)
            if err:
                return err

            card, err = self._get_card_or_error(user, card_id)
            if err:
                return err

            if task_index < 0 or task_index >= len(card["tasks"]):
                return make_response(
                    False, error="Task index out of range.", status=404
                )

            task = card["tasks"][task_index]

            # Update text if provided
            if "text" in body:
                new_text = (body["text"] or "").strip()
                if not new_text:
                    return make_response(
                        False, error="Task text cannot be empty.", status=400
                    )
                task["text"] = new_text

            # Update completed if provided
            if "completed" in body:
                task["completed"] = bool(body["completed"])

            self.storage.write(data)

        return make_response(True, data=card)

    def delete_task(self, user_id, card_id, task_index):
        """Delete a task from a card by index.

        Args:
            user_id: The integer user ID.
            card_id: The integer card ID.
            task_index: The zero-based task index.

        Returns:
            dict: Standardized response with the updated card dict on success.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()
            user, err = self._get_user_or_error(data, user_id)
            if err:
                return err

            card, err = self._get_card_or_error(user, card_id)
            if err:
                return err

            if task_index < 0 or task_index >= len(card["tasks"]):
                return make_response(
                    False, error="Task index out of range.", status=404
                )

            card["tasks"].pop(task_index)
            self.storage.write(data)

        return make_response(True, data=card)

    def bulk_task_action(self, user_id, card_id, action):
        """Execute a bulk action on a card's tasks.

        Supported actions:
            - ``"complete_all"``: Mark every task as completed.
            - ``"delete_completed"``: Remove all completed tasks.

        Args:
            user_id: The integer user ID.
            card_id: The integer card ID.
            action: The action string.

        Returns:
            dict: Standardized response with the updated card dict on success.
        """
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        check = validate_bulk_action(action)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()
            user, err = self._get_user_or_error(data, user_id)
            if err:
                return err

            card, err = self._get_card_or_error(user, card_id)
            if err:
                return err

            if action == "complete_all":
                for task in card["tasks"]:
                    task["completed"] = True
            elif action == "delete_completed":
                card["tasks"] = [t for t in card["tasks"] if not t["completed"]]

            self.storage.write(data)

        return make_response(True, data=card)
