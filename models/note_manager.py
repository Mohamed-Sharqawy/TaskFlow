import uuid
from utils.helpers import make_response, utc_timestamp
from utils.validators import validate_note_title, validate_user_id

class NoteManager:
    
    def __init__(self, storage):
        
        self.storage = storage
        
    
    
    
    def find_note(self, data, note_id):
        
        for note in data["notes"]:
            if note["id"] == note_id:
                return note
        return None
    
    
    def get_notes(self, user_id):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        with self.storage.lock:
            data = self.storage.read()
            
        user_notes = [n for n in data["notes"] if n["user_id"] == user_id]
        
        user_notes.sort(key=lambda n: n["created_at"], reverse=True)
        
        return make_response(True, data=user_notes)
    
    def create_notes(self, user_id, title, body=""):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
        
        check = validate_note_title(title)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
        
        now = utc_timestamp()
        
        new_note = {
            "id" : str(uuid.uuid4()),
            "user_id" : user_id,
            "title" : title,
            "created_at" : now,
            "updated_at" : now,
        }
        
        with self.storage.lock:
            data = self.storage.read()
            data["notes"].append(new_note)
            self.storage.write(data)
            
        return make_response(True, data=new_note)
    
    def update_note(self, note_id, user_id, title=None, body=None):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        with self.storage.lock:
            data = self.storage.read()
            note = self.find_note(data, note_id)
            
            if not note:
                return make_response(
                    False, error="Note not found!", status=404
                )
            
            if note["user_id"] != user_id:
                return make_response(
                    False, error="Unathorized!", status=403
                )
                
            if title is not None:
                title = title.strip()
                check = validate_note_title(title)
                if not check["success"]:
                    return make_response(
                        False, error=check["error"], status=400
                    )
                note["title"] = title
                
            if body is not None:
                note["body"] = body
                
            note["updated_at"] = utc_timestamp()
            self.storage.write(data)
            
            return make_response(True, data=note)
        
    def delete_note(self, note_id, user_id):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["success"], status=400
            )
        
        with self.storage.lock:
            data = self.storage.read()
            
            note = self.find_note(data, note_id)
            if not note:
                return make_response(
                    False, error="Note not Found!", status=404
                )
            
            if note["user_id"] != user_id:
                return make_response(
                    False, error="Unauthorized!", status=403
                )
            
            data["note"] = [n for n in data["notes"] if n["id"] != note_id]
            self.storage.write(data)
            
        return make_response(
            True, data="Not deleted"
        )
        
    def search_notes(self, user_id, query):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
        
        with self.storage.lock:
            data = self.storage.read()
            
        q = (query or "").strip().lower()
        matches = [
            n for n in data["notes"]
            if n["user_id"] == user_id and q in n["title"].lower()
        ]
        matches.sort(key=lambda n: n["created_at"], reverse=True)
        
        return make_response(True, data=matches)