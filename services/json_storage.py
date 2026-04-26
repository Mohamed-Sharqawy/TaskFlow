import json
import os
import threading

class JsonStorage:
    
    DEFAULT_DATA = {"users": [], "last_user_id": 0}
    
    
    def __init__(self, filepath, default_data=None):
        self.filepath = filepath
        self.lock = threading.Lock()
        if default_data is not None:
            self.defualt_data = default_data
        else:
            self.defualt_data = self.DEFAULT_DATA
            
    def read(self):
        
        with open(self.filepath, "r", encoding="utf-8") as f:
            return json.load(f)
        
    def write(self, data):
        
        with open(self.filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
    def ensure_file_existance(self):
        
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        if not os.path.exists(self.filepath):
            self.write(self.defualt_data)