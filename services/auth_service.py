
class AuthService:
    
    def __init__(self, user_manager):
        self.user_manager = user_manager
        
    def login(self, username, password):
        
        return self.user_manager.login(username, password)
    
    def register(self, username, password):
        
        return self.user_manager.register(username, password)
    
    