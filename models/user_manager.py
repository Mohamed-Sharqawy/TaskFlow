"""
UserManager — User Registration & Authentication
===================================================
Handles all user-related business logic. Uses JsonStorage for
persistence and helpers/validators for reusable operations.
"""

from werkzeug.security import check_password_hash, generate_password_hash

from utils.helpers import find_user_by_id, find_user_by_username, make_response
from utils.validators import validate_login_fields, validate_password, validate_username


class UserManager:
    """Manages user registration, authentication, and lookup.

    Attributes:
        storage: A JsonStorage instance for data persistence.
    """

    def __init__(self, storage):
        """Initialize with a JsonStorage instance.

        Args:
            storage: The JsonStorage instance to use for reads/writes.
        """
        self.storage = storage

    def register(self, username, password):
        """Register a new user with a hashed password.

        Args:
            username: The desired username (will be stripped).
            password: The raw password string.

        Returns:
            dict: Standardized response with ``user_id`` and ``username`` on
                success, or an error message on failure.
        """
        # Validate fields
        check = validate_login_fields(username, password)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        check = validate_username(username)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        check = validate_password(password)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()

            # Check for duplicate username
            if find_user_by_username(data, username):
                return make_response(False, error="Username already exists.", status=409)

            # Create user with hashed password
            data["last_user_id"] += 1
            new_user = {
                "id": data["last_user_id"],
                "username": username,
                "password": generate_password_hash(password),
                "cards": [],
            }
            data["users"].append(new_user)
            self.storage.write(data)

        return make_response(
            True,
            data={"user_id": new_user["id"], "username": new_user["username"]},
        )

    def login(self, username, password):
        """Authenticate a user by username and password.

        Args:
            username: The trimmed username string.
            password: The raw password string.

        Returns:
            dict: Standardized response with ``user_id`` and ``username`` on
                success, or an error with appropriate status code on failure.
        """
        # Validate fields
        check = validate_login_fields(username, password)
        if not check["success"]:
            return make_response(False, error=check["error"], status=400)

        with self.storage.lock:
            data = self.storage.read()
            user = find_user_by_username(data, username)

        if user is None:
            return make_response(False, error="user_not_found", status=404)

        if not check_password_hash(user["password"], password):
            return make_response(False, error="Invalid password.", status=401)

        return make_response(
            True,
            data={"user_id": user["id"], "username": user["username"]},
        )

    def get_user(self, user_id):
        """Fetch a user by ID.

        Args:
            user_id: The integer user ID.

        Returns:
            dict: Standardized response with the user dict on success,
                or an error if not found.
        """
        with self.storage.lock:
            data = self.storage.read()
            user = find_user_by_id(data, user_id)

        if not user:
            return make_response(False, error="User not found.", status=404)

        return make_response(True, data=user)
