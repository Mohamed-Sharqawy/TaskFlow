"""
JsonStorage — Centralized JSON File I/O
========================================
The ONLY module that reads/writes the JSON data file.
All other modules interact with persistent storage through this class.
"""

import json
import os
import threading


class JsonStorage:
    """Thread-safe JSON file storage handler.

    Attributes:
        filepath: Absolute path to the JSON data file.
        lock: Threading lock for safe concurrent access.
    """

    # Default structure for a new data file
    DEFAULT_DATA = {"users": [], "last_user_id": 0}

    def __init__(self, filepath, default_data=None):
        """Initialize storage with the given file path.

        Args:
            filepath: Absolute path to the JSON data file.
            default_data: Optional custom default structure for new files.
        """
        self.filepath = filepath
        self.lock = threading.Lock()
        if default_data is not None:
            self._default_data = default_data
        else:
            self._default_data = self.DEFAULT_DATA

    def read(self):
        """Read and return the full JSON data store.

        Returns:
            dict: The parsed JSON data.
        """
        with open(self.filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    def write(self, data):
        """Write the full data object back to the JSON file.

        Args:
            data: The complete data dict to persist.
        """
        with open(self.filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def ensure_file_exists(self):
        """Create the data directory and file if they don't already exist.

        Uses DEFAULT_DATA as the initial file content.
        """
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        if not os.path.exists(self.filepath):
            self.write(self._default_data)
