def ok():
    return {"success":True}

def fail(message):
    return {"success": False, "error" : message}

def validate_user_id(user_id):
    
    if not user_id:
        return fail("User Id is required!")
    return ok

def validate_username(username):
    
    if not username:
        return fail("Username and Password are required!")
    if len(username) < 3:
        return fail("Username must be at least 3 Characters!")
    return ok()

def validate_password(password):
    
    if not password:
        return fail("Username and password are required!")
    if len(password) < 4:
        return fail("Password must be at least 4 Characters!")
    return ok()

def validate_login_fields(username, password):
    
    if not username or not password:
        return fail("Username and password are required!")
    return ok()

def validate_card_title(title):
    
    if not title:
        return fail("Card title is required!")
    return ok

def validate_task_body(body):
    
    if not body:
        return fail("Task body is required!")
    return ok()

def validate_note_title(title):
    
    if not title:
        return fail("Note title is required!")
    return ok()

def validate_bulk_action(action):
    
    if action not in ("complete_all", "delete_completed"):
        return fail("Invalid action! Use 'Complete all' or 'Delete completed' !")
    return ok()