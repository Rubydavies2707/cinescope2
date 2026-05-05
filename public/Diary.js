const apiKey = '5e5feec5';

// Helper to scope localStorage keys to the current user
function getUserKey(key) {
  const userId = (typeof auth !== 'undefined' && auth.currentUser) 
    ? auth.currentUser.uid 
    : 'guest';
  return `${key}_${userId}`;
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Diary Page Loaded!");

 

  // DOM elements
  const diaryEntries = document.getElementById("diary-entries");
  const diaryEmpty = document.getElementById("diary-empty");
  const sortSelect = document.getElementById("diary-sort");
  const ratingFilterSelect = document.getElementById("diary-rating-filter");
  const monthFilterSelect = document.getElementById("diary-month-filter");

  const placeholder = "https://via.placeholder.com/300x450?text=No+Image";

  /* -------------------------------------------
     LOAD DIARY DATA
  ------------------------------------------- */
  function getDiaryData() {
    const recentlyViewed = JSON.parse(localStorage.getItem(getUserKey("recent")) || "[]");
    const ratings = JSON.parse(localStorage.getItem(getUserKey("movieRatings")) || "{}");

    // Merge rating/review data into each diary entry
    return recentlyViewed.map(movie => {
      const ratingData = ratings[movie.imdbID] || null;
      return {
        ...movie,
        viewedDate: movie.viewedDate || null,
        userRating: ratingData ? ratingData.rating : null,
        userReview: ratingData ? ratingData.review : "",
        ratingTimestamp: ratingData ? ratingData.timestamp : null
      };
    });
  }

  /* -------------------------------------------
     CALCULATE STATS
  ------------------------------------------- */
  function updateStats(entries) {
    const ratings = JSON.parse(localStorage.getItem(getUserKey("movieRatings")) || "{}");
    const totalLogged = entries.length;
    const totalRated = entries.filter(e => e.userRating !== null).length;
    const totalReviewed = entries.filter(e => e.userReview && e.userReview.trim()).length;

    // Count films logged this month
    const now = new Date();
    const thisMonth = entries.filter(e => {
      if (!e.viewedDate) return false;
      const viewDate = new Date(e.viewedDate);
      return viewDate.getMonth() === now.getMonth() && viewDate.getFullYear() === now.getFullYear();
    }).length;

    document.getElementById("diary-total").textContent = totalLogged;
    document.getElementById("diary-rated").textContent = totalRated;
    document.getElementById("diary-reviewed").textContent = totalReviewed;
    document.getElementById("diary-this-month").textContent = thisMonth;
  }

  /* -------------------------------------------
     BUILD MONTH FILTER OPTIONS
  ------------------------------------------- */
  function buildMonthFilter(entries) {
    const months = new Set();

    entries.forEach(entry => {
      if (entry.viewedDate) {
        const date = new Date(entry.viewedDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        months.add(key);
      }
    });

    const sortedMonths = [...months].sort().reverse();

    // Keep "All Time" option, add months
    monthFilterSelect.innerHTML = '<option value="all">All Time</option>';
    sortedMonths.forEach(monthKey => {
      const [year, month] = monthKey.split("-");
      const date = new Date(year, month - 1);
      const label = date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      monthFilterSelect.innerHTML += `<option value="${monthKey}">${label}</option>`;
    });
  }

  /* -------------------------------------------
     FILTER ENTRIES
  ------------------------------------------- */
  function filterEntries(entries) {
    const ratingFilter = ratingFilterSelect.value;
    const monthFilter = monthFilterSelect.value;

    return entries.filter(entry => {
      // Rating filter
      if (ratingFilter !== "all") {
        if (ratingFilter === "unrated") {
          if (entry.userRating !== null) return false;
        } else {
          if (entry.userRating !== parseInt(ratingFilter)) return false;
        }
      }

      // Month filter
      if (monthFilter !== "all" && entry.viewedDate) {
        const date = new Date(entry.viewedDate);
        const entryMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (entryMonth !== monthFilter) return false;
      }

      return true;
    });
  }

  /* -------------------------------------------
     SORT ENTRIES
  ------------------------------------------- */
  function sortEntries(entries) {
    const sortType = sortSelect.value;

    return [...entries].sort((a, b) => {
      switch (sortType) {
        case "date-desc":
          return (new Date(b.viewedDate || 0)) - (new Date(a.viewedDate || 0));
        case "date-asc":
          return (new Date(a.viewedDate || 0)) - (new Date(b.viewedDate || 0));
        case "rating-desc":
          return (b.userRating || 0) - (a.userRating || 0);
        case "rating-asc":
          return (a.userRating || 0) - (b.userRating || 0);
        case "title-asc":
          return a.Title.localeCompare(b.Title);
        case "title-desc":
          return b.Title.localeCompare(a.Title);
        default:
          return 0;
      }
    });
  }

  /* -------------------------------------------
     FORMAT DATE
  ------------------------------------------- */
  function formatDate(dateString) {
    if (!dateString) return "Date unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function getRelativeDate(dateString) {
    if (!dateString) return "";
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
    return "";
  }

  /* -------------------------------------------
     RENDER DIARY
  ------------------------------------------- */
  function renderDiary() {
    const allEntries = getDiaryData();

    if (allEntries.length === 0) {
      diaryEntries.innerHTML = "";
      diaryEmpty.classList.remove("hidden");
      updateStats([]);
      return;
    }

    diaryEmpty.classList.add("hidden");
    updateStats(allEntries);
    buildMonthFilter(allEntries);

    const filtered = filterEntries(allEntries);
    const sorted = sortEntries(filtered);

    if (sorted.length === 0) {
      diaryEntries.innerHTML = `
        <div class="diary-no-results">
          <p>No entries match your filters. Try adjusting your selection.</p>
        </div>
      `;
      return;
    }

    // Group entries by month for date-sorted views
    const sortType = sortSelect.value;
    const groupByDate = sortType === "date-desc" || sortType === "date-asc";

    if (groupByDate) {
      renderGroupedDiary(sorted);
    } else {
      renderFlatDiary(sorted);
    }
  }

  function renderGroupedDiary(entries) {
    let currentMonth = "";
    let html = "";

    entries.forEach(entry => {
      // Work out the month group header
      let monthLabel = "Undated";
      if (entry.viewedDate) {
        const date = new Date(entry.viewedDate);
        monthLabel = date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      }

      if (monthLabel !== currentMonth) {
        currentMonth = monthLabel;
        html += `<div class="diary-month-header"><h2>${currentMonth}</h2></div>`;
      }

      html += buildEntryCard(entry);
    });

    diaryEntries.innerHTML = html;
    attachEntryListeners();
  }

  function renderFlatDiary(entries) {
    diaryEntries.innerHTML = entries.map(entry => buildEntryCard(entry)).join("");
    attachEntryListeners();
  }

  function buildEntryCard(entry) {
    const dateFormatted = formatDate(entry.viewedDate);
    const relativeDate = getRelativeDate(entry.viewedDate);
    const starDisplay = entry.userRating
      ? `<span class="diary-stars">${"⭐".repeat(entry.userRating)}</span> <span class="diary-rating-number">${entry.userRating}/5</span>`
      : `<span class="diary-unrated">Not yet rated</span>`;

    const reviewSnippet = entry.userReview && entry.userReview.trim()
      ? `<div class="diary-review-snippet"><p>"${entry.userReview}"</p></div>`
      : "";

    const imdbRating = entry.imdbRating && entry.imdbRating !== "N/A"
      ? `<span class="diary-imdb">IMDb ${entry.imdbRating}</span>`
      : "";

    return `
      <div class="diary-entry" data-id="${entry.imdbID}">
        <div class="diary-entry-poster">
          <img src="${entry.Poster && entry.Poster !== "N/A" ? entry.Poster : placeholder}" alt="${entry.Title}">
        </div>
        <div class="diary-entry-content">
          <div class="diary-entry-top">
            <h3 class="diary-entry-title">${entry.Title}</h3>
            <span class="diary-entry-year">${entry.Year || ""}</span>
          </div>
          <div class="diary-entry-date">
            <span class="diary-date-full">📅 ${dateFormatted}</span>
            ${relativeDate ? `<span class="diary-date-relative">${relativeDate}</span>` : ""}
          </div>
          <div class="diary-entry-rating">
            ${starDisplay}
            ${imdbRating}
          </div>
          ${reviewSnippet}
          <div class="diary-entry-meta">
            ${entry.Genre ? `<span class="diary-genre">${entry.Genre}</span>` : ""}
            ${entry.Runtime ? `<span class="diary-runtime">${entry.Runtime}</span>` : ""}
          </div>
        </div>
        <div class="diary-entry-actions">
          <button class="secondary-btn diary-remove-btn" data-id="${entry.imdbID}" title="Remove from diary">✕</button>
        </div>
      </div>
    `;
  }

  /* -------------------------------------------
     ENTRY INTERACTIONS
  ------------------------------------------- */
  function attachEntryListeners() {
    // Click entry to go to movie detail on main page
    document.querySelectorAll(".diary-entry").forEach(entry => {
      entry.addEventListener("click", (e) => {
        // Don't trigger if clicking the remove button
        if (e.target.closest(".diary-remove-btn")) return;
        const imdbID = entry.dataset.id;
        window.location.href = `index.html?movie=${imdbID}`;
      });
    });

    // Remove from diary
    document.querySelectorAll(".diary-remove-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const imdbID = btn.dataset.id;
        if (confirm("Remove this film from your diary?")) {
          removeFromDiary(imdbID);
        }
      });
    });
  }

  function removeFromDiary(imdbID) {
    let recent = JSON.parse(localStorage.getItem(getUserKey("recent")) || "[]");
    recent = recent.filter(m => m.imdbID !== imdbID);
    localStorage.setItem(getUserKey("recent"), JSON.stringify(recent));
    renderDiary();
  }

  /* -------------------------------------------
     EVENT LISTENERS
  ------------------------------------------- */
  sortSelect.addEventListener("change", renderDiary);
  ratingFilterSelect.addEventListener("change", renderDiary);
  monthFilterSelect.addEventListener("change", renderDiary);

  // Initial render
  renderDiary();
});