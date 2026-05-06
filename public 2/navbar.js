/* -------------------------------------------
   NAVBAR - Dynamic Injection with Auth
   Shared navigation bar across all pages.
------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

  // Determine which page is currently active
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  function isActive(page) {
    return currentPage === page ? "active" : "";
  }

  // Build the navbar HTML
  const navbarHTML = `
    <div id="logo">
      <a href="index.html" style="display: flex; align-items: center; gap: 12px; text-decoration: none;">
        <span class="logo-icon">🎬</span>
        <span class="logo-text">CineScope</span>
      </a>
    </div>
    <div id="nav-menu">
      <a href="index.html" class="nav-link ${isActive("index.html")}">Search</a>
      <a href="diary.html" class="nav-link ${isActive("diary.html")}">Diary</a>
      <a href="analytics.html" class="nav-link ${isActive("analytics.html")}">Analytics</a>
      <a href="compare.html" class="nav-link ${isActive("compare.html")}">Compare</a>
      <a href="streaming.html" class="nav-link ${isActive("streaming.html")}">Streaming</a>
      <a href="social.html" class="nav-link ${isActive("social.html")}">Social</a>
    </div>
    <div id="nav-buttons">
      <button id="toggle-dark" class="icon-btn">🌙</button>
      <button id="view-watchlist" class="primary-btn">⭐ Watchlist</button>
    </div>
  `;

  // Inject into the navbar placeholder
  const navbar = document.getElementById("navbar");
  if (navbar) {
    navbar.innerHTML = navbarHTML;
  }

  /* -------------------------------------------
     DARK MODE (shared across all pages)
  ------------------------------------------- */
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
  }

  document.getElementById("toggle-dark").onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", document.body.classList.contains("dark"));
  };

  /* -------------------------------------------
     WATCHLIST BUTTON (shared across all pages)
  ------------------------------------------- */
  document.getElementById("view-watchlist").onclick = () => {
    window.location.href = "index.html?view=watchlist";
  };

  /* -------------------------------------------
     MOBILE HAMBURGER MENU
  ------------------------------------------- */
  function setupMobileMenu() {
    const navMenu = document.getElementById("nav-menu");

    const hamburger = document.createElement("button");
    hamburger.id = "hamburger-btn";
    hamburger.className = "icon-btn hamburger-btn";
    hamburger.innerHTML = "☰";
    hamburger.setAttribute("aria-label", "Toggle navigation menu");

    const navButtons = document.getElementById("nav-buttons");
    navButtons.insertBefore(hamburger, navButtons.firstChild);

    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("mobile-open");
      hamburger.innerHTML = navMenu.classList.contains("mobile-open") ? "✕" : "☰";
    });

    navMenu.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("mobile-open");
        hamburger.innerHTML = "☰";
      });
    });
  }

  setupMobileMenu();
});