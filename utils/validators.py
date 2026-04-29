"""
Validators — Centralized Input Validation
===========================================
All validation logic lives here. Every function returns a standardized
response dict so callers can check ``result["success"]`` consistently.
"""


def _ok():
    """Return a successful validation result."""
    return {"success": True}


def _fail(message):
    """Return a failed validation result with an error message."""
    return {"success": False, "error": message}


# ---------------------------------------------------------------------------
# Field-Level Validators
# ---------------------------------------------------------------------------

def validate_user_id(user_id):
    """Validate that a user_id is present.

    Args:
        user_id: The user ID value to check.

    Returns:
        dict: ``{"success": True}`` or ``{"success": False, "error": "..."}``
    """
    if not user_id:
        return _fail("user_id is required.")
    return _ok()


def validate_username(username):
    """Validate a username for registration.

    Rules:
        - Must not be empty
        - Must be at least 3 characters

    Args:
        username: The trimmed username string.

    Returns:
        dict: Validation result.
    """
    if not username:
        return _fail("Username and password are required.")
    if len(username) < 3:
        return _fail("Username must be at least 3 characters.")
    return _ok()


def validate_password(password):
    """Validate a password for registration.

    Rules:
        - Must not be empty
        - Must be at least 4 characters

    Args:
        password: The raw password string.

    Returns:
        dict: Validation result.
    """
    if not password:
        return _fail("Username and password are required.")
    if len(password) < 4:
        return _fail("Password must be at least 4 characters.")
    return _ok()


def validate_login_fields(username, password):
    """Validate that both login fields are non-empty.

    Args:
        username: The trimmed username string.
        password: The raw password string.

    Returns:
        dict: Validation result.
    """
    if not username or not password:
        return _fail("Username and password are required.")
    return _ok()


def validate_card_title(title):
    """Validate a card title.

    Args:
        title: The trimmed card title string.

    Returns:
        dict: Validation result.
    """
    if not title:
        return _fail("Card title is required.")
    return _ok()


def validate_task_text(text):
    """Validate task text.

    Args:
        text: The trimmed task text string.

    Returns:
        dict: Validation result.
    """
    if not text:
        return _fail("Task text is required.")
    return _ok()


def validate_note_title(title):
    """Validate a note title.

    Args:
        title: The trimmed note title string.

    Returns:
        dict: Validation result.
    """
    if not title:
        return _fail("Note title is required.")
    return _ok()


def validate_bulk_action(action):
    """Validate a bulk task action string.

    Args:
        action: The action string (expected: 'complete_all' or 'delete_completed').

    Returns:
        dict: Validation result.
    """
    if action not in ("complete_all", "delete_completed"):
        return _fail("Invalid action. Use 'complete_all' or 'delete_completed'.")
    return _ok()
