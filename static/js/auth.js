(() => {
    "use strict";

    const session = State.getSession();
    if(session && session.user_id){
        window.location.href = "/dashboard";
        return;
    }

    const errorBox = document.getElementById("error-box");

    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove("d-none");
    }

    function hideError(){
        errorBox.classList.add("d-none");
        errorBox.textContent = "";
    }

    const loginForm = document.getElementById("login-form");
    if(loginForm) {
        loginForm.addEventListener("submit", async(e) =>{
            e.preventDefault();
            hideError()

            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value;

            if(!username || !password){
                showError("Please enter both username and password!");
                return
            }

            const btn = document.getElementById("login-btn");
            btn.textContent = "Signig in...";
            btn.disabled = true;

            try{
                const data = await API.login(username, password);
                State.saveSession(data.username, data.user_id);
                window.location.href = "/dashboard";
            } catch(err) {
                if(err === "user_not_found"){
                    showError("Account not found. Redirecting to register...");
                    setTimeout(() => {window.location.href = "/register";}, 1500);
                } else {
                    showError(err);
                }
                btn.textContent = "Sign In";
                btn.disabled = false;
            }
        });
    }
    
    const registerForm = document.getElementById("regsiter-form");
    if(registerForm) {
        registerForm.addEventListener("submit", async(e) => {
            e.preventDefault();
            hideError();

            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value;

            if(!username || !password){
                showError("Please fill in all fields!");
                return;
            }
            if(username.length < 3){
                showError("Username must be at least 3 characters!");
                return;
            }
            if(password.length < 4){
                showError("Password must be at least 4 characters!");
                return;
            }

            const btn = document.getElementById("register-btn");
            btn.textContent = "Creating account....";
            btn.disabled = true;

            try{
                const data = await API.register(username, password);

                State.saveSession(data.username, data,user_id);
                window.location.href ="/dashboard";
            }catch(err){
                showError(err);
                btn.textContent = "Create Account";
                btn.disabled = false;
            }
        });
    }
})();