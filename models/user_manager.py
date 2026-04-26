from werkzeug.security import check_password_hash, generate_password_hash

from utils.helpers import find_user_by_id, find_user_by_username, make_response
from utils.validators import validate_login_fields, validate_password, validate_username

class UserManager:
    
    def __init__(self, storage):
        
        self.storage = storage
        
    def register(self, username, password):
        
        check = validate_login_fields(username, password)
        if not check["success"]:
            return make_response(False, error=check["error"], status=404)
        
        check = validate_username(username)
        if not check["success"]:
            return make_response(False, error=check["error"], status=404)
        
        check = validate_password(password)
        if not check["success"]:
            return make_response(False, error=check["error"], status=404)
        
        with self.storage.lock:
            
            data = self.storage.read()
            
            if find_user_by_username(data, username):
                return make_response(False, error="Username already exists!", status=409)
            
            data["last_user_id"] += 1
            
            new_user = {
                "id" : data["last_user_id"],
                "username" : username,
                "password" : generate_password_hash(password),
                "cards" : [],
            }
            
            data["users"].append(new_user)
            self.storage.write(data)
            

        return make_response(
                            True,
                            data={"user_id":new_user["id"], "username": new_user["username"]}
                        )
        
    
    def login(self, username, password):
        
        check = validate_login_fields(username, password)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        with self.storage.lock:
            data = self.storage.read()
            user = find_user_by_username(data, username)
            
        if user is None:
            return make_response(
                False, error="User not found!", status=404
            )
            
        if not check_password_hash(user["password"], password):
            return make_response(
                False, error="Invalid Password!", status=401
            )
            
        return make_response(
            True,
            data={"user_id": user["id"], "username":user["username"]},
        )
        
    def get_user(self, user_id):
        
        with self.storage.lock:
            data = self.storage.read()
            user = find_user_by_id(data, user_id)
        
        if not user:
            return make_response(
                False,error="User not Found!", status=404
            )
            
        return make_response(True, data=user)