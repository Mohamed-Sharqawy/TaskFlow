// theme.js
document.addEventListener("DOMContentLoaded", () => {
  // Load saved theme
  const savedTheme = localStorage.getItem("theme") || "light";
  document.body.classList.add(savedTheme + "-mode");

  // Attach event listeners to all theme toggle buttons
  const toggleBtns = document.querySelectorAll(".theme-toggle-btn");
  
  toggleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const current = document.body.classList.contains("dark-mode") ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";

      document.body.classList.remove(current + "-mode");
      document.body.classList.add(next + "-mode");

      localStorage.setItem("theme", next);
    });
  });
});
