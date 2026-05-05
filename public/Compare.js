const apiKey = '5e5feec5';

document.addEventListener("DOMContentLoaded", () => {
  console.log("Compare Page Loaded!");

  
  // DOM elements
  const movie1Input = document.getElementById("movie1-input");
  const movie2Input = document.getElementById("movie2-input");
  const movie3Input = document.getElementById("movie3-input");
  const compareBtn = document.getElementById("compare-btn");
  const clearBtn = document.getElementById("clear-comparison");
  const comparisonResults = document.getElementById("comparison-results");
  const comparisonGrid = document.getElementById("comparison-grid");
  const watchlistSelect = document.getElementById("watchlist-select");

  const selectedMovies = [null, null, null];
  const placeholder = "https://via.placeholder.com/300x450?text=No+Image";

  /* -------------------------------------------
     AUTOCOMPLETE FOR EACH INPUT
  ------------------------------------------- */
  async function setupAutocomplete(input, autocompleteDiv, index) {
    let debounceTimer;

    input.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
          autocompleteDiv.style.display = "none";
          return;
        }

        let data;
        try {
          const url = `https://www.omdbapi.com/?apikey=${apiKey}&s=${query}`;
          const response = await fetch(url);
          data = await response.json();
        } catch (error) {
          console.error("Search failed:", error);
          autocompleteDiv.innerHTML = `<div class="autocomplete-item">Search unavailable — check your connection</div>`;
          autocompleteDiv.style.display = "block";
          return;
        }

        if (!data.Search) {
          if (data.Error) {
            autocompleteDiv.innerHTML = `<div class="autocomplete-item">Search unavailable — ${data.Error}</div>`;
            autocompleteDiv.style.display = "block";
          } else {
            autocompleteDiv.style.display = "none";
          }
          return;
        }

        autocompleteDiv.innerHTML = data.Search.slice(0, 5).map(m => `
          <div class="autocomplete-item" data-id="${m.imdbID}" data-title="${m.Title}">
            ${m.Title} (${m.Year})
          </div>
        `).join("");

        autocompleteDiv.style.display = "block";

        autocompleteDiv.querySelectorAll(".autocomplete-item").forEach(item => {
          item.addEventListener("click", async () => {
            input.value = item.dataset.title;
            autocompleteDiv.style.display = "none";
            
            // Fetch full movie details
            const movieData = await fetchMovieDetails(item.dataset.id);
            selectedMovies[index] = movieData;
          });
        });
      }, 300);
    });
  }

  setupAutocomplete(movie1Input, document.getElementById("movie1-autocomplete"), 0);
  setupAutocomplete(movie2Input, document.getElementById("movie2-autocomplete"), 1);
  setupAutocomplete(movie3Input, document.getElementById("movie3-autocomplete"), 2);

  /* -------------------------------------------
     FETCH MOVIE DETAILS
  ------------------------------------------- */
  async function fetchMovieDetails(imdbID) {
    try {
      const url = `https://www.omdbapi.com/?apikey=${apiKey}&i=${imdbID}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();

      if (data.Error) {
        throw new Error(data.Error);
      }

      return data;
    } catch (error) {
      console.error("Failed to fetch movie details:", error);
      return null;
    }
  }

  /* -------------------------------------------
     COMPARE MOVIES
  ------------------------------------------- */
  compareBtn.addEventListener("click", async () => {
    const moviesToCompare = selectedMovies.filter(m => m !== null);

    if (moviesToCompare.length < 2) {
      alert("⚠️ Please select at least 2 movies to compare!");
      return;
    }

    // Check for any failed fetches
    const validMovies = moviesToCompare.filter(m => m && m.Title);
    if (validMovies.length < 2) {
      alert("⚠️ Some movies failed to load. Please try selecting them again.");
      return;
    }

    displayComparison(validMovies);
  });

  function displayComparison(movies) {
    comparisonResults.classList.remove("hidden");
    
    comparisonGrid.innerHTML = movies.map(movie => `
      <div class="comparison-card">
        <img src="${movie.Poster !== "N/A" ? movie.Poster : placeholder}" alt="${movie.Title}">
        <div class="comparison-details">
          <h3>${movie.Title}</h3>
          
          <div class="comparison-stat">
            <span class="stat-label-comp">Year</span>
            <span class="stat-value-comp">${movie.Year}</span>
          </div>
          
          <div class="comparison-stat">
            <span class="stat-label-comp">IMDB Rating</span>
            <span class="stat-value-comp">${movie.imdbRating}/10</span>
          </div>
          
          <div class="comparison-stat">
            <span class="stat-label-comp">Runtime</span>
            <span class="stat-value-comp">${movie.Runtime}</span>
          </div>
          
          <div class="comparison-stat">
            <span class="stat-label-comp">Genre</span>
            <span class="stat-value-comp">${movie.Genre}</span>
          </div>
          
          <div class="comparison-stat">
            <span class="stat-label-comp">Director</span>
            <span class="stat-value-comp">${movie.Director}</span>
          </div>
          
          <div class="comparison-stat">
            <span class="stat-label-comp">Actors</span>
            <span class="stat-value-comp">${movie.Actors}</span>
          </div>
          
          <div class="comparison-stat">
            <span class="stat-label-comp">Box Office</span>
            <span class="stat-value-comp">${movie.BoxOffice || "N/A"}</span>
          </div>
          
          <div class="comparison-stat">
            <span class="stat-label-comp">Awards</span>
            <span class="stat-value-comp">${movie.Awards || "N/A"}</span>
          </div>

          <div class="comparison-stat">
            <span class="stat-label-comp">Metascore</span>
            <span class="stat-value-comp">${movie.Metascore || "N/A"}</span>
          </div>
        </div>
      </div>
    `).join("");

    // Scroll to results
    comparisonResults.scrollIntoView({ behavior: "smooth" });
  }

  /* -------------------------------------------
     CLEAR COMPARISON
  ------------------------------------------- */
  clearBtn.addEventListener("click", () => {
    movie1Input.value = "";
    movie2Input.value = "";
    movie3Input.value = "";
    selectedMovies[0] = null;
    selectedMovies[1] = null;
    selectedMovies[2] = null;
    comparisonResults.classList.add("hidden");
    comparisonGrid.innerHTML = "";
  });

  /* -------------------------------------------
     QUICK COMPARE FROM WATCHLIST
  ------------------------------------------- */
  function loadWatchlist() {
    const watchlist = JSON.parse(localStorage.getItem("watchlist") || "[]");

    if (watchlist.length === 0) {
      watchlistSelect.innerHTML = "<p>Your watchlist is empty. Add some movies first!</p>";
      return;
    }

    watchlistSelect.innerHTML = watchlist.map(movie => `
      <div class="watchlist-item" data-id="${movie.imdbID}">
        <img src="${movie.Poster !== "N/A" ? movie.Poster : placeholder}" alt="${movie.Title}">
        <div class="watchlist-item-title">${movie.Title}</div>
      </div>
    `).join("");

    const watchlistItems = document.querySelectorAll(".watchlist-item");
    const selectedForComparison = [];

    watchlistItems.forEach(item => {
      item.addEventListener("click", () => {
        if (item.classList.contains("selected")) {
          item.classList.remove("selected");
          const index = selectedForComparison.findIndex(id => id === item.dataset.id);
          selectedForComparison.splice(index, 1);
        } else {
          if (selectedForComparison.length < 3) {
            item.classList.add("selected");
            selectedForComparison.push(item.dataset.id);
          } else {
            alert("⚠️ You can only select up to 3 movies at a time!");
          }
        }

        // Auto-compare when 2+ selected
        if (selectedForComparison.length >= 2) {
          compareWatchlistMovies(selectedForComparison);
        }
      });
    });
  }

  async function compareWatchlistMovies(imdbIDs) {
    try {
      const movies = await Promise.all(
        imdbIDs.map(id => fetchMovieDetails(id))
      );
      const validMovies = movies.filter(m => m !== null && m.Title);

      if (validMovies.length < 2) {
        alert("⚠️ Could not load enough movies to compare. Please try again.");
        return;
      }

      displayComparison(validMovies);
    } catch (error) {
      console.error("Watchlist comparison failed:", error);
      alert("⚠️ Something went wrong. Please check your connection and try again.");
    }
  }
  loadWatchlist();
});