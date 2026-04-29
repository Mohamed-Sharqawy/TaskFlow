"""
Helpers — Generic Reusable Utility Functions
==============================================
Pure functions with no side effects. Used by models and services
to avoid duplicating common lookups and operations.
"""

from datetime import datetime, timezone


def find_user_by_id(data, user_id):
    """Find a user dict by numeric ID.

    Args:
        data: The full data store dict (must contain ``"users"`` list).
        user_id: The integer user ID to search for.

    Returns:
        dict or None: The user dict if found, otherwise None.
    """
    for user in data["users"]:
        if user["id"] == user_id:
            return user
    return None


def find_user_by_username(data, username):
    """Find a user dict by username.

    Args:
        data: The full data store dict.
        username: The username string to search for.

    Returns:
        dict or None: The user dict if found, otherwise None.
    """
    for user in data["users"]:
        if user["username"] == username:
            return user
    return None


def find_card(user, card_id):
    """Find a card dict inside a user's card list.

    Args:
        user: The user dict (must contain ``"cards"`` list).
        card_id: The integer card ID to search for.

    Returns:
        dict or None: The card dict if found, otherwise None.
    """
    for card in user["cards"]:
        if card["id"] == card_id:
            return card
    return None


def next_card_id(user):
    """Compute the next available card ID for a user.

    Args:
        user: The user dict with a ``"cards"`` list.

    Returns:
        int: The next card ID (max existing + 1, or 1 if no cards).
    """
    if not user["cards"]:
        return 1
    return max(c["id"] for c in user["cards"]) + 1


def utc_timestamp():
    """Return the current UTC time as an ISO-8601 string.

    Returns:
        str: e.g. ``"2026-04-22T08:30:00+00:00"``
    """
    return datetime.now(timezone.utc).isoformat()


def make_response(success, data=None, error=None, status=None):
    """Build a standardized internal response dict.

    Args:
        success: Boolean indicating success or failure.
        data: Payload data (on success).
        error: Error message string (on failure).
        status: HTTP status code hint for the route layer.

    Returns:
        dict: ``{"success": bool, "data": ..., "error": ..., "status": int}``
    """
    resp = {"success": success, "data": data, "error": error}
    if status is not None:
        resp["status"] = status
    return resp
