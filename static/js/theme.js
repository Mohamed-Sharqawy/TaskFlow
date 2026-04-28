document.addEventListener("DOMContentLoaded", () =>{
    
    const savedTheme = localStorage.getItem("theme") || "light";
    document.body.classList.add(savedTheme + "-mode");

    const toggleBtns = document.querySelectorAll(".theme-toggle-btn");

    toggleBtns.forEach(
        btn => {
            btn.addEventListener("click", () => {
                const current = document.body.classList.contains("dark-mode") ? "dark" : "light";
                const next = current === "dark" ? "light" : "dark";

                document.body.classList.remove(current + "-mode");
                document.body.classList.add(next + "-mode");

                localStorage.setItem("theme", next);
            });
        });
});