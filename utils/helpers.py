from datetime import datetime, timezone

def find_user_by_id(data, user_id):
    
    for user in data["users"]:
        if user["id"] == user_id:
            return user
        
    return None


def find_user_by_username(data, username):
    
    for user in data["users"]:
        if user["username"] == username:
            return user
        
    return None

def find_card(user, card_id):
    
    for card in user["cards"]:
        if card["id"] == card_id:
            return card
        
    return None

def next_card_id(user):
    
    if not user["cards"]:
        return 1
    
    return max(c["id"] for c in user["cards"]) + 1

def utc_timestamp():
    
    return datetime.now(timezone.utc).isoformat()

def make_response(success, data=None, error=None, status=None):
    
    resp = {"success":success, "data":data, "error":error}
    if status is not None:
        resp["status"] = status
        
    return resp

