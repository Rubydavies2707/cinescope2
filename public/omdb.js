const apiKey = '5e5feec5';

// Helper to scope localStorage keys to the current user
function getUserKey(key) {
  const userId = (typeof auth !== 'undefined' && auth.currentUser) 
    ? auth.currentUser.uid 
    : 'guest';
  return `${key}_${userId}`;
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("CineScope JS Loaded!");

  // DOM elements
  const searchInput = document.getElementById("search");
  const searchBtn = document.getElementById("search-btn");
  const results = document.getElementById("results");
  const spinner = document.getElementById("spinner");
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");
  const closeModal = document.getElementById("close-modal");
  const sortSelect = document.getElementById("sort-options");
  const clearCacheBtn = document.getElementById("clear-cache");
  const watchlistBtn = document.getElementById("view-watchlist");
  const autocompleteBox = document.getElementById("autocomplete");
  const recentlyViewed = document.getElementById("recently-viewed");

  // Advanced filters
  const toggleFiltersBtn = document.getElementById("toggle-filters");
  const filterPanel = document.getElementById("filter-panel");
  const applyFiltersBtn = document.getElementById("apply-filters");
  const resetFiltersBtn = document.getElementById("reset-filters");
  const ratingFilter = document.getElementById("rating-filter");
  const decadeFilter = document.getElementById("decade-filter");
  const runtimeFilter = document.getElementById("runtime-filter");
  const typeFilter = document.getElementById("type-filter");

  let currentQuery = "";
  let currentPage = 1;
  let loading = false;
  let allMovies = [];

  const placeholder = "https://via.placeholder.com/300x450?text=No+Image";

  /* -------------------------------------------
     WORD FILTER
  ------------------------------------------- */
  const encodedWords = "YXNzLGJhc3RhcmQsYml0Y2gsYm9sbG9ja3MsY3JhcCxjdW50LGRhbW4sZGljayxmdWNrLG5pZ2dlcixwaXNzLHNoaXQsc2x1dCx3YW5rZXIsd2hvcmU=";
  const bannedWords = atob(encodedWords).split(",");

  function containsBannedWords(text) {
    const lower = text.toLowerCase();
    return bannedWords.filter(word => {
      const regex = new RegExp('\\b' + word + '\\b', 'i');
      return regex.test(lower);
    });
  }

  /* -------------------------------------------
     AUTH CHECK HELPER
  ------------------------------------------- */
  function isUserAllowed() {
    // User is allowed if logged in via Firebase OR in guest mode
    return (typeof auth !== 'undefined' && auth.currentUser) || localStorage.getItem("guestMode") === "true";
  }

  /* -------------------------------------------
     CACHE FUNCTIONS
  ------------------------------------------- */
  function saveCache(key, data) {
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  }

  function loadCache(key) {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const week = 7 * 24 * 60 * 60 * 1000;

    if (Date.now() - parsed.timestamp > week) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  }

  function showSpinner() { spinner.classList.remove("hidden"); }
  function hideSpinner() { spinner.classList.add("hidden"); }

  /* -------------------------------------------
     AUTOCOMPLETE
  ------------------------------------------- */
  async function updateAutocomplete(query) {
    if (query.length < 2) {
      autocompleteBox.style.display = "none";
      return;
    }

    const url = `https://www.omdbapi.com/?apikey=${apiKey}&s=${query}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.Search) {
      autocompleteBox.style.display = "none";
      return;
    }

    autocompleteBox.innerHTML = data.Search.slice(0, 5).map(m => `
      <div class="autocomplete-item" data-title="${m.Title}">
        ${m.Title} (${m.Year})
      </div>
    `).join("");

    autocompleteBox.style.display = "block";

    document.querySelectorAll(".autocomplete-item").forEach(item => {
      item.addEventListener("click", () => {
        searchInput.value = item.dataset.title;
        autocompleteBox.style.display = "none";
        startSearch();
      });
    });
  }

  searchInput.addEventListener("input", e => {
    updateAutocomplete(e.target.value);
  });

  /* -------------------------------------------
     MULTI SEARCH MODE
  ------------------------------------------- */
  function detectSearchType(query) {
    query = query.toLowerCase();

    if (query.includes("starring")) {
      return { mode: "actor", name: query.replace("starring", "").trim() };
    }

    if (query.includes("directed by")) {
      return { mode: "director", name: query.replace("directed by", "").trim() };
    }

    return { mode: "title", name: query };
  }

  async function fetchMovies(query, page = 1) {
    const searchType = detectSearchType(query);
    let url = "";

    if (searchType.mode === "title") {
      url = `https://www.omdbapi.com/?apikey=${apiKey}&s=${query}&page=${page}`;
    }

    if (searchType.mode === "actor") {
      url = `https://www.omdbapi.com/?apikey=${apiKey}&s=${searchType.name}&page=${page}`;
    }

    if (searchType.mode === "director") {
      url = `https://www.omdbapi.com/?apikey=${apiKey}&s=${searchType.name}&page=${page}`;
    }

    return fetch(url).then(r => r.json());
  }

  /* -------------------------------------------
     FETCH FULL MOVIE DETAILS (for filtering)
  ------------------------------------------- */
  async function fetchFullMovieDetails(imdbID) {
    const cacheKey = `movie_${imdbID}`;
    let cached = loadCache(cacheKey);
    
    if (cached) return cached;

    const url = `https://www.omdbapi.com/?apikey=${apiKey}&i=${imdbID}`;
    const response = await fetch(url);
    const data = await response.json();
    
    saveCache(cacheKey, data);
    return data;
  }

  /* -------------------------------------------
     ADVANCED FILTERS
  ------------------------------------------- */
  function applyAdvancedFilters(movies) {
    const minRating = parseFloat(ratingFilter.value);
    const decade = decadeFilter.value;
    const runtime = runtimeFilter.value;
    const type = typeFilter.value;

    return movies.filter(movie => {
      if (minRating > 0 && movie.imdbRating) {
        const rating = parseFloat(movie.imdbRating);
        if (isNaN(rating) || rating < minRating) return false;
      }

      if (decade !== "all") {
        const year = parseInt(movie.Year);
        if (decade === "pre1970") {
          if (year >= 1970) return false;
        } else {
          const decadeStart = parseInt(decade);
          if (year < decadeStart || year >= decadeStart + 10) return false;
        }
      }

      if (runtime !== "all" && movie.Runtime) {
        const runtimeMin = parseInt(movie.Runtime);
        if (!isNaN(runtimeMin)) {
          if (runtime === "short" && runtimeMin >= 90) return false;
          if (runtime === "medium" && (runtimeMin < 90 || runtimeMin > 120)) return false;
          if (runtime === "long" && runtimeMin <= 120) return false;
        }
      }

      if (type !== "all" && movie.Type) {
        if (type !== movie.Type.toLowerCase()) return false;
      }

      return true;
    });
  }

  toggleFiltersBtn.addEventListener("click", () => {
    filterPanel.classList.toggle("hidden");
  });

  applyFiltersBtn.addEventListener("click", async () => {
    showSpinner();
    
    const detailedMovies = await Promise.all(
      allMovies.map(movie => fetchFullMovieDetails(movie.imdbID))
    );
    
    const filtered = applyAdvancedFilters(detailedMovies);
    results.innerHTML = "";
    displayResults(filtered);
    hideSpinner();
  });

  resetFiltersBtn.addEventListener("click", () => {
    ratingFilter.value = "0";
    decadeFilter.value = "all";
    runtimeFilter.value = "all";
    typeFilter.value = "all";
    sortSelect.value = "none";
    
    results.innerHTML = "";
    displayResults(allMovies);
  });

  /* -------------------------------------------
     SEARCH
  ------------------------------------------- */
  async function startSearch(reset = true) {
    const query = searchInput.value.trim();
    if (!query) return;

    autocompleteBox.style.display = "none";

    if (reset) {
      results.innerHTML = "";
      allMovies = [];
      currentPage = 1;
    }

    currentQuery = query;

    loadMore();
  }

  /* -------------------------------------------
     INFINITE SCROLL (LOAD MORE)
  ------------------------------------------- */
  async function loadMore() {
    if (loading) return;
    loading = true;
    showSpinner();

    const cacheKey = `search_${currentQuery}_${currentPage}`;
    let data = loadCache(cacheKey);

    if (!data) {
      data = await fetchMovies(currentQuery, currentPage);
      if (data.Response !== "False") saveCache(cacheKey, data);
    }

    hideSpinner();
    loading = false;

    if (!data.Search) return;

    allMovies = [...allMovies, ...data.Search];

    displayResults(data.Search);

    currentPage += 1;
  }

  window.addEventListener("scroll", () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
      if (currentQuery) loadMore();
    }
  });

  /* -------------------------------------------
     DISPLAY MOVIES
  ------------------------------------------- */
  function sortResults(list) {
    const type = sortSelect.value;
    if (type === "none") return list;

    return [...list].sort((a, b) => {
      if (type === "title-asc") return a.Title.localeCompare(b.Title);
      if (type === "title-desc") return b.Title.localeCompare(a.Title);
      if (type === "year-asc") return a.Year.localeCompare(b.Year);
      if (type === "year-desc") return b.Year.localeCompare(a.Year);
      if (type === "rating-desc") {
        const ratingA = parseFloat(a.imdbRating) || 0;
        const ratingB = parseFloat(b.imdbRating) || 0;
        return ratingB - ratingA;
      }
      if (type === "rating-asc") {
        const ratingA = parseFloat(a.imdbRating) || 0;
        const ratingB = parseFloat(b.imdbRating) || 0;
        return ratingA - ratingB;
      }
    });
  }

  function displayResults(list) {
    const sorted = sortResults(list);

    results.innerHTML += sorted.map(movie => `
      <div class="movie" data-id="${movie.imdbID}">
        <img src="${movie.Poster !== "N/A" ? movie.Poster : placeholder}" alt="${movie.Title}">
        <h3>${movie.Title}</h3>
      </div>
    `).join("");

    document.querySelectorAll(".movie").forEach(card => {
      card.onclick = () => showMovieDetails(card.dataset.id);
    });
  }

  /* -------------------------------------------
     MOVIE MODAL + RECENTLY VIEWED
  ------------------------------------------- */
  function saveRecentlyViewed(movie) {
    let list = JSON.parse(localStorage.getItem(getUserKey("recent")) || "[]");

    list = list.filter(m => m.imdbID !== movie.imdbID);

    // Add the date this film was viewed for the diary
    movie.viewedDate = new Date().toISOString();

    list.unshift(movie);

    list = list.slice(0, 50);
    localStorage.setItem(getUserKey("recent"), JSON.stringify(list));

    renderRecentlyViewed();
  }

  function renderRecentlyViewed() {
    let list = JSON.parse(localStorage.getItem(getUserKey("recent")) || "[]");

    if (list.length === 0) {
      recentlyViewed.innerHTML = "";
      return;
    }

    recentlyViewed.innerHTML = `
      <h2>Recently Viewed</h2>
      <div class="recent-row">
        ${list.map(m => `
          <div class="movie" data-id="${m.imdbID}">
            <img src="${m.Poster !== "N/A" ? m.Poster : placeholder}" alt="${m.Title}">
            <h3>${m.Title}</h3>
          </div>
        `).join("")}
      </div>
    `;

    recentlyViewed.querySelectorAll(".movie").forEach(card => {
      card.onclick = () => showMovieDetails(card.dataset.id);
    });
  }

  renderRecentlyViewed();

  async function showMovieDetails(id) {
    modal.style.display = "flex";
    modalBody.innerHTML = "Loading...";

    let movie = await fetchFullMovieDetails(id);

    saveRecentlyViewed(movie);

    const ratings = movie.Ratings || [];
    const ratingsHTML = ratings.map(r => `
      <p><strong>${r.Source}:</strong> ${r.Value}</p>
    `).join("");

    // Get user's rating if exists
    const userRating = getUserRating(id);
    const userRatingStars = userRating ? userRating.rating : 0;
    const userReview = userRating ? userRating.review : "";

    // Check if user is allowed to rate/review
    const allowed = isUserAllowed();

    modalBody.innerHTML = `
      <h2>${movie.Title} (${movie.Year})</h2>
      
      <!-- Trailer Section -->
      <div class="trailer-section">
        <button id="load-trailer-btn" class="primary-btn">🎬 Watch Trailer</button>
        <div id="trailer-container" class="hidden"></div>
      </div>

      <img src="${movie.Poster !== "N/A" ? movie.Poster : placeholder}" alt="${movie.Title}">
      
      <!-- User Rating Section -->
      <div class="user-rating-section">
        ${allowed ? `
          <h3>Your Rating</h3>
          <div class="star-rating" data-imdb-id="${id}">
            ${[1, 2, 3, 4, 5].map(star => `
              <span class="star ${star <= userRatingStars ? 'active' : ''}" data-rating="${star}">⭐</span>
            `).join("")}
          </div>
          <textarea id="user-review" placeholder="Write a review (optional)..." rows="3">${userReview}</textarea>
          <button id="save-rating" class="primary-btn">Save Rating & Review</button>
        ` : `
          <h3>Your Rating</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px;">Sign in to rate and review this film</p>
          <a href="login.html" class="primary-btn" style="text-decoration: none; display: inline-block;">Sign In to Rate</a>
        `}
      </div>

      <p><strong>Genre:</strong> ${movie.Genre}</p>
      <p><strong>Director:</strong> ${movie.Director}</p>
      <p><strong>Actors:</strong> ${movie.Actors}</p>
      <p><strong>Runtime:</strong> ${movie.Runtime}</p>
      <p><strong>IMDB Rating:</strong> ${movie.imdbRating}/10</p>
      ${ratingsHTML}
      <p><strong>Plot:</strong> ${movie.Plot}</p>
      <p><strong>Box Office:</strong> ${movie.BoxOffice || "N/A"}</p>
      <p><strong>Awards:</strong> ${movie.Awards || "N/A"}</p>
      ${allowed
        ? `<button id="add-watch" class="primary-btn">Add to Watchlist</button>`
        : `<a href="login.html" class="primary-btn" style="text-decoration: none; display: inline-block;">Sign In to Add to Watchlist</a>`
      }
    `;

    // Load trailer button
    document.getElementById("load-trailer-btn").onclick = async () => {
      await loadTrailer(movie.Title, movie.Year);
    };

    // Only set up rating interactions if user is allowed
    if (allowed) {
      // Star rating interaction
      const stars = modalBody.querySelectorAll(".star");
      let selectedRating = userRatingStars;

      stars.forEach(star => {
        star.addEventListener("click", () => {
          selectedRating = parseInt(star.dataset.rating);
          stars.forEach(s => {
            s.classList.toggle("active", parseInt(s.dataset.rating) <= selectedRating);
          });
        });

        star.addEventListener("mouseenter", () => {
          const hoverRating = parseInt(star.dataset.rating);
          stars.forEach(s => {
            s.classList.toggle("hover", parseInt(s.dataset.rating) <= hoverRating);
          });
        });

        star.addEventListener("mouseleave", () => {
          stars.forEach(s => s.classList.remove("hover"));
        });
      });

      // Word filter on paste
      const reviewInput = document.getElementById("user-review");
      if (reviewInput) {
        reviewInput.addEventListener("paste", () => {
          setTimeout(() => {
            const found = containsBannedWords(reviewInput.value);
            if (found.length > 0) {
              alert("⚠️ Your review contains inappropriate language. Please revise it before submitting.");
            }
          }, 10);
        });
      }

      // Save rating button
      const saveRatingBtn = document.getElementById("save-rating");
      if (saveRatingBtn) {
        saveRatingBtn.onclick = () => {
          if (selectedRating === 0) {
            alert("⚠️ Please select a rating!");
            return;
          }

          const review = document.getElementById("user-review").value.trim();

          // Word filter check on submit
          if (review.length > 0) {
            const found = containsBannedWords(review);
            if (found.length > 0) {
              alert("⚠️ Your review contains inappropriate language. Please revise it before submitting.");
              return;
            }
          }

          saveUserRating(id, selectedRating, review, movie);
          alert("✅ Rating saved!");
        };
      }

      // Watchlist button
      const addWatchBtn = document.getElementById("add-watch");
      if (addWatchBtn) {
        addWatchBtn.onclick = () => addToWatchlist(movie);
      }
    }
  }

  // User rating functions
  function getUserRating(imdbID) {
    const ratings = JSON.parse(localStorage.getItem(getUserKey("movieRatings")) || "{}");
    return ratings[imdbID] || null;
  }

  async function saveUserRating(imdbID, rating, review = "", movieData = null) {
    // Save to localStorage (existing behaviour)
    const ratings = JSON.parse(localStorage.getItem(getUserKey("movieRatings")) || "{}");
    ratings[imdbID] = {
      rating: rating,
      review: review,
      timestamp: Date.now(),
      imdbID: imdbID
    };
    localStorage.setItem(getUserKey("movieRatings"), JSON.stringify(ratings));

    // Save to Firestore if logged in
    if (auth.currentUser) {
      try {
        await db.collection("users").doc(auth.currentUser.uid)
          .collection("ratings").doc(imdbID).set({
            imdbID: imdbID,
            rating: rating,
            review: review || "",
            title: movieData?.Title || "",
            poster: movieData?.Poster || "",
            year: movieData?.Year || "",
            timestamp: Date.now()
          });
        console.log("✅ Rating saved to Firestore");
      } catch (error) {
        console.error("Failed to save rating to Firestore:", error);
      }
    }
  }

  closeModal.onclick = () => modal.style.display = "none";

  /* -------------------------------------------
     TRAILER FUNCTIONALITY (TMDB API)
  ------------------------------------------- */
  async function loadTrailer(movieTitle, movieYear) {
    const trailerBtn = document.getElementById("load-trailer-btn");
    const trailerContainer = document.getElementById("trailer-container");
    
    trailerBtn.textContent = "Loading trailer...";
    trailerBtn.disabled = true;

    try {
      const tmdbApiKey = localStorage.getItem("tmdbApiKey");
      
      if (!tmdbApiKey) {
        showTMDBSetup(trailerContainer);
        trailerBtn.style.display = "none";
        return;
      }

      const currentMovieId = modalBody.querySelector('[data-imdb-id]').dataset.imdbId;
      const videoId = await getTrailerFromTMDB(currentMovieId, tmdbApiKey);

      if (videoId) {
        trailerContainer.innerHTML = `
          <div class="trailer-player">
            <iframe 
              width="100%" 
              height="400" 
              src="https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
        `;
        trailerContainer.classList.remove("hidden");
        trailerBtn.style.display = "none";
      } else {
        throw new Error("Trailer not found");
      }
    } catch (error) {
      console.error("Trailer load error:", error);
      trailerContainer.innerHTML = `
        <div class="trailer-error">
          <p>❌ Trailer not available</p>
          <p class="small-text">We couldn't find a trailer for this movie.</p>
        </div>
      `;
      trailerContainer.classList.remove("hidden");
      trailerBtn.style.display = "none";
    }
  }

  async function getTrailerFromTMDB(imdbId, apiKey) {
    try {
      const findUrl = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`;
      const findResponse = await fetch(findUrl);
      const findData = await findResponse.json();

      if (!findData.movie_results || findData.movie_results.length === 0) {
        return null;
      }

      const tmdbId = findData.movie_results[0].id;

      const videosUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${apiKey}`;
      const videosResponse = await fetch(videosUrl);
      const videosData = await videosResponse.json();

      if (!videosData.results || videosData.results.length === 0) {
        return null;
      }

      const trailer = videosData.results.find(v => 
        v.site === "YouTube" && v.type === "Trailer" && v.official
      ) || videosData.results.find(v => 
        v.site === "YouTube" && v.type === "Trailer"
      ) || videosData.results.find(v => 
        v.site === "YouTube" && v.type === "Teaser"
      ) || videosData.results.find(v => 
        v.site === "YouTube"
      );

      return trailer ? trailer.key : null;
    } catch (error) {
      console.error("TMDB API error:", error);
      return null;
    }
  }

  function showTMDBSetup(container) {
    container.innerHTML = `
      <div class="tmdb-setup">
        <h3>🎬 Enable Movie Trailers</h3>
        <p>Get a free TMDB API key to watch trailers!</p>
        
        <div class="setup-steps">
          <div class="step">
            <span class="step-number">1</span>
            <div class="step-content">
              <strong>Sign up at TMDB</strong>
              <a href="https://www.themoviedb.org/signup" target="_blank" class="setup-link">
                themoviedb.org/signup →
              </a>
            </div>
          </div>
          
          <div class="step">
            <span class="step-number">2</span>
            <div class="step-content">
              <strong>Verify your email</strong>
              <p class="small-text">Check your inbox (takes 10 seconds)</p>
            </div>
          </div>
          
          <div class="step">
            <span class="step-number">3</span>
            <div class="step-content">
              <strong>Get your API key</strong>
              <p class="small-text">Settings → API → Request API Key</p>
            </div>
          </div>
          
          <div class="step">
            <span class="step-number">4</span>
            <div class="step-content">
              <strong>Enter it below</strong>
              <input type="text" id="tmdb-key-input" placeholder="Paste your API key here..." />
              <button id="save-tmdb-key" class="primary-btn">Save & Load Trailer</button>
            </div>
          </div>
        </div>
        
        <p class="info-text">✨ Takes 30 seconds total. Free forever. No credit card needed.</p>
      </div>
    `;
    container.classList.remove("hidden");

    setTimeout(() => {
      document.getElementById("save-tmdb-key").onclick = () => {
        const key = document.getElementById("tmdb-key-input").value.trim();
        if (key) {
          localStorage.setItem("tmdbApiKey", key);
          alert("✅ API key saved! Loading trailer...");
          location.reload();
        } else {
          alert("⚠️ Please enter your API key");
        }
      };
    }, 100);
  }

  /* -------------------------------------------
     WATCHLIST
  ------------------------------------------- */
  function addToWatchlist(movie) {
    let list = JSON.parse(localStorage.getItem(getUserKey("watchlist")) || "[]");

    if (!list.some(m => m.imdbID === movie.imdbID)) {
      list.push(movie);
      localStorage.setItem(getUserKey("watchlist"), JSON.stringify(list));
      alert("✅ Added to watchlist!");
    } else {
      alert("⚠️ Already in watchlist!");
    }
  }

  watchlistBtn.onclick = () => {
    const list = JSON.parse(localStorage.getItem(getUserKey("watchlist")) || "[]");

    results.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center;">
        <h2 style="font-family: 'Playfair Display', serif; font-size: 36px; margin: 20px 0;">Your Watchlist</h2>
      </div>
    ` + list.map(movie => `
      <div class="movie" data-id="${movie.imdbID}">
        <img src="${movie.Poster !== "N/A" ? movie.Poster : placeholder}" alt="${movie.Title}">
        <h3>${movie.Title}</h3>
      </div>
    `).join("");

    document.querySelectorAll(".movie").forEach(card => {
      card.onclick = () => showMovieDetails(card.dataset.id);
    });

    searchInput.value = "";
    window.scrollTo(0, 0);
  };

  /* -------------------------------------------
     BUTTON HANDLERS
  ------------------------------------------- */
  searchBtn.onclick = () => startSearch();
  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") startSearch();
  });

  sortSelect.onchange = () => {
    if (allMovies.length > 0) {
      results.innerHTML = "";
      displayResults(allMovies);
    }
  };

  clearCacheBtn.addEventListener("click", () => {
    localStorage.clear();
    alert("🗑️ Cache cleared!");
    location.reload();
  });
});