"""
AuthService — Authentication Abstraction Layer
=================================================
Thin wrapper over UserManager that provides a clean interface for
login and registration. This keeps route handlers from directly
coupling to the UserManager implementation.
"""


class AuthService:
    """High-level authentication service.

    Attributes:
        user_manager: A UserManager instance for user operations.
    """

    def __init__(self, user_manager):
        """Initialize with a UserManager instance.

        Args:
            user_manager: The UserManager to delegate to.
        """
        self.user_manager = user_manager

    def login(self, username, password):
        """Authenticate a user.

        Args:
            username: The trimmed username string.
            password: The raw password string.

        Returns:
            dict: Standardized response from UserManager.login().
        """
        return self.user_manager.login(username, password)

    def register(self, username, password):
        """Register a new user.

        Args:
            username: The trimmed username string.
            password: The raw password string.

        Returns:
            dict: Standardized response from UserManager.register().
        """
        return self.user_manager.register(username, password)
