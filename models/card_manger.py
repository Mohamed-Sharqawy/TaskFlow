from utils.helpers import(
    find_card,
    find_user_by_id,
    make_response,
    next_card_id,
    utc_timestamp,
)

from utils.validators import(
    validate_bulk_action,
    validate_card_title,
    validate_task_body,
    validate_user_id,
)

class CardManager:
    
    def __init__(self, storage):
        
        self.storage = storage
        
    
    def get_user_or_error(self, data, user_id):
        
        user = find_user_by_id(data, user_id)
        if not user:
            return None, make_response(
                False, error="User not found!", status=404
            )
        
        return user, None
    
    def get_card_or_error(slef, user, card_id):
        
        card = find_card(user, card_id)
        if not card:
            return None, make_response(
                False, error="Card Not Found!", status=404
            )
        
        return card, None
    
    def get_cards(self, user_id):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
        
        with self.storage.lock:
            data = self.storage.read()
            user, err = self.get_user_or_error(data, user_id)
            if err:
                return err
            
        return make_response(True, data=user["cards"])
    
    def create_card(self, user_id, title):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        check = validate_card_title(title)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        with self.storage.lock:
            data = self.storage.read()
            user, err = self.get_user_or_error(data, user_id)
            if err:
                return err
            
            new_card = {
                "id": next_card_id(user),
                "title" : title,
                "created_at" : utc_timestamp(),
                "tasks" : [],
            }
            
            user["cards"].append(new_card)
            self.storage.write(data)\
                
        return make_response(
            True, data=new_card
        ),
        
    def update_card(self, user_id, card_id, title):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        check = validate_card_title(title)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        with self.storage.lock:
            data = self.storage.read()
            user, err = self.get_card_or_error(data, user_id)
            if err:
                return err
            
            card, err = self.get_card_or_error(data, card_id)
            if err:
                return err
            
            card["title"] = title
            self.storage.write(data)
            
        return make_response(True, data=card)
    
    def delete_card(self, user_id, card_id):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        with self.storage.lock:
            data = self.storage.read()
            user, err = self.get_user_or_error(data, user_id)
            
            if err:
                return err
            
            original_len = len(user["cards"])
            user["cards"] = (c for c in user["cards"] if c["id"] != card_id)
            
            if len(user["cards"]) == original_len:
                return make_response(
                    False, error="Card not found!", status=404
                )
                
            self.storage.write(data)
        
        return make_response(True, data="Card Deleted!")
    
    def bulk_delete_cards(self, user_id):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        with self.storage.lock:
            data = self.storage.read()
            user, err = self.get_user_or_error(data, user_id)
            if err:
                return err
            
            user["cards"] = []
            self.storage.write(data)
            
        return make_response(
            True, data="All cards deleted!"
        )
        
    
    def add_task(self, user_id, card_id, body):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        check = validate_task_body(body)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
        
        with self.storage.lock:
            data = self.storage.read()
            user, err = self.get_user_or_error(data, user_id)
            if err:
                return err
        
            card, err = self.get_card_or_error(user, card_id)
            if err:
                return err
            
            new_task = {"body":body, "completed": False}
            card["tasks"].append(new_task)
            
        return make_response(True, data=card)
    
    
    def update_task(self, user_id, card_id, task_index, body):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
        
        with self.storage.lock:
            data = self.storage.read()
            user, err = self.get_user_or_error(data, user_id)
            if err:
                return err
            
            card, err = self.get_card_or_error(user, user_id)
            if err:
                return err
            
            if task_index < 0 or task_index >= len(card["tasks"]):
                return make_response(
                    False, error="Task index out of range!", status=404
                )
                
            task = card["tasks"][task_index]
            
            if "body" in body:
                new_text = (body["body"] or "").strip()
                if not new_text:
                    return make_response(
                        False, error="Task Body cannot be empty!", status=400
                    )
                
                task["body"] = new_text
                
            if "completed" in body:
                task["completed"] = bool(body["completed"])
                
            self.storage.write(data)
                
        return make_response(True, data=card)
    
    def delete_task(self, user_id, card_id, task_index):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        with self.storage.lock:
            data = self.storage.read()
            user, err = self.get_user_or_error(data, user_id)
            if err:
                return err
            
            card, err = self.get_card_or_error(user, card_id)
            if err:
                return err
            
            if task_index < 0 or task_index >= len(card["tasks"]):
                return make_response(
                    False, error="Task index out of range!", status=404
                )
                
            card["tasks"].pop(task_index)
            self.storage.write(data)
            
        return make_response(
            True, data=card
        )
            
            
    def bulk_task_action(self, user_id, card_id, action):
        
        check = validate_user_id(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
            
        check = validate_bulk_action(user_id)
        if not check["success"]:
            return make_response(
                False, error=check["error"], status=400
            )
        
        with self.storage.lock:
            data = self.storage.read()
            user, err = self.get_user_or_error(data, user_id)
            if err:
                return err
            
            card, err = self.get_card_or_error(user, card_id)
            if err:
                return err
            
            if action == "complete_all":
                for task in card["tasks"]:
                    task["completed"] = True
            elif action == "delete_completed":
                card["tasks"] = [t for t in card["tasks"] if not t["completed"]]
                
            self.storage.write(data)
            
        return make_response(True, data=card)
            
        