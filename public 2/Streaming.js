const omdbApiKey = '5e5feec5';

document.addEventListener("DOMContentLoaded", () => {
  console.log("Streaming Page Loaded!");

  // DOM elements
  const searchInput = document.getElementById("streaming-search-input");
  const searchBtn = document.getElementById("streaming-search-btn");
  const autocomplete = document.getElementById("streaming-autocomplete");
  const streamingResults = document.getElementById("streaming-results");
  const movieInfoCard = document.getElementById("movie-info-card");
  const streamingOptions = document.getElementById("streaming-options");
  const checkWatchlistBtn = document.getElementById("check-watchlist");
  const watchlistStreamingResults = document.getElementById("watchlist-streaming-results");
  const serviceButtons = document.querySelectorAll(".service-btn");
  const serviceResults = document.getElementById("service-results");
  const apiNotice = document.getElementById("api-notice");

  if (apiNotice) apiNotice.style.display = "none";

  const placeholder = "https://via.placeholder.com/300x450?text=No+Image";
  let currentMovie = null;

  // Check if TMDb key exists (same key used for trailers)
  function getTmdbKey() {
    return localStorage.getItem("tmdbApiKey");
  }

  /* -------------------------------------------
     AUTOCOMPLETE (uses OMDb for search)
  ------------------------------------------- */
  let debounceTimer;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const query = e.target.value.trim();

      if (query.length < 2) {
        autocomplete.style.display = "none";
        return;
      }

      let data;
      try {
        const url = `https://www.omdbapi.com/?apikey=${omdbApiKey}&s=${query}`;
        const response = await fetch(url);
        data = await response.json();
      } catch (error) {
        console.error("Search failed:", error);
        autocomplete.innerHTML = `<div class="autocomplete-item">Search unavailable — check your connection</div>`;
        autocomplete.style.display = "block";
        return;
      }

      if (!data.Search) {
        if (data.Error) {
          autocomplete.innerHTML = `<div class="autocomplete-item">Search unavailable — ${data.Error}</div>`;
          autocomplete.style.display = "block";
        } else {
          autocomplete.style.display = "none";
        }
        return;
      }

      autocomplete.innerHTML = data.Search.slice(0, 5).map(m => `
        <div class="autocomplete-item" data-id="${m.imdbID}" data-title="${m.Title}">
          ${m.Title} (${m.Year})
        </div>
      `).join("");

      autocomplete.style.display = "block";

      autocomplete.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", async () => {
          searchInput.value = item.dataset.title;
          autocomplete.style.display = "none";
          currentMovie = await fetchOmdbDetails(item.dataset.id);
          checkStreamingAvailability();
        });
      });
    }, 300);
  });

  searchBtn.addEventListener("click", async () => {
    if (currentMovie && currentMovie.Title) {
      checkStreamingAvailability();
    } else {
      alert("⚠️ Please select a movie from the suggestions first.");
    }
  });

  /* -------------------------------------------
     FETCH MOVIE DETAILS (OMDb)
  ------------------------------------------- */
  async function fetchOmdbDetails(imdbID) {
    try {
      const url = `https://www.omdbapi.com/?apikey=${omdbApiKey}&i=${imdbID}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.Error) throw new Error(data.Error);
      return data;
    } catch (error) {
      console.error("Failed to fetch movie details:", error);
      return null;
    }
  }

  /* -------------------------------------------
     GET TMDb ID FROM IMDb ID
  ------------------------------------------- */
  async function getTmdbId(imdbId, apiKey) {
    try {
      const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.movie_results && data.movie_results.length > 0) {
        return data.movie_results[0].id;
      }
      return null;
    } catch (error) {
      console.error("TMDb lookup failed:", error);
      return null;
    }
  }

  /* -------------------------------------------
     GET WATCH PROVIDERS FROM TMDb
  ------------------------------------------- */
  async function getWatchProviders(tmdbId, apiKey) {
    try {
      const url = `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.results || {};
    } catch (error) {
      console.error("Watch providers fetch failed:", error);
      return {};
    }
  }

  /* -------------------------------------------
     SERVICE LOGOS & COLOURS
  ------------------------------------------- */
  const serviceLogos = {
    "Netflix": { emoji: "🎬", color: "#E50914" },
    "Amazon Prime Video": { emoji: "📺", color: "#00A8E1" },
    "Disney Plus": { emoji: "✨", color: "#113CCF" },
    "Apple TV Plus": { emoji: "🍎", color: "#000000" },
    "Apple TV": { emoji: "🍎", color: "#333333" },
    "NOW": { emoji: "📡", color: "#1E6B3B" },
    "Sky Go": { emoji: "📡", color: "#071D49" },
    "ITVX": { emoji: "📺", color: "#00B6F1" },
    "BBC iPlayer": { emoji: "📺", color: "#FF0058" },
    "Channel 4": { emoji: "📺", color: "#000000" },
    "Paramount Plus": { emoji: "⛰️", color: "#0064FF" },
    "Crunchyroll": { emoji: "🎌", color: "#F47521" },
    "MUBI": { emoji: "🎞️", color: "#000000" },
    "BFI Player": { emoji: "🎞️", color: "#000000" },
    "Curzon Home Cinema": { emoji: "🎬", color: "#1A1A1A" },
    "Rakuten TV": { emoji: "📺", color: "#BF0A31" },
    "Microsoft Store": { emoji: "🪟", color: "#737373" },
    "Google Play Movies": { emoji: "▶️", color: "#01875F" },
    "YouTube": { emoji: "▶️", color: "#FF0000" },
    "Hulu": { emoji: "📡", color: "#1CE783" },
    "HBO Max": { emoji: "🎭", color: "#5822B4" },
    "Max": { emoji: "🎭", color: "#002BE7" },
    "Peacock": { emoji: "🦚", color: "#000000" },
  };

  function getServiceInfo(name) {
    return serviceLogos[name] || { emoji: "📺", color: "#666666" };
  }

  /* -------------------------------------------
     CHECK STREAMING AVAILABILITY
  ------------------------------------------- */
  async function checkStreamingAvailability() {
    const tmdbKey = getTmdbKey();

    if (!tmdbKey) {
      alert("⚠️ Please save your TMDb API key first! It's the same key used for trailers.");
      return;
    }

    streamingResults.classList.remove("hidden");

    // Display movie info
    movieInfoCard.innerHTML = `
      <img src="${currentMovie.Poster !== "N/A" ? currentMovie.Poster : placeholder}" alt="${currentMovie.Title}">
      <div>
        <h2>${currentMovie.Title} (${currentMovie.Year})</h2>
        <p><strong>Genre:</strong> ${currentMovie.Genre}</p>
        <p><strong>Director:</strong> ${currentMovie.Director}</p>
        <p><strong>IMDB Rating:</strong> ${currentMovie.imdbRating}/10</p>
        <p>${currentMovie.Plot}</p>
      </div>
    `;

    streamingOptions.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px;"><p>Loading streaming availability...</p></div>`;

    try {
      const tmdbId = await getTmdbId(currentMovie.imdbID, tmdbKey);

      if (!tmdbId) {
        streamingOptions.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px;"><p>Could not find this movie on TMDb.</p></div>`;
        return;
      }

      const providers = await getWatchProviders(tmdbId, tmdbKey);
      const regionData = providers.GB || providers.US || null;

      if (!regionData) {
        streamingOptions.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <h3>😔 Not Currently Streaming</h3>
            <p>This movie doesn't appear to be available for streaming in the UK or US right now.</p>
            <p class="small-text">Availability changes frequently — check back soon!</p>
          </div>
        `;
        return;
      }

      displayProviders(regionData, providers.GB ? "GB" : "US");

    } catch (error) {
      console.error("Streaming check failed:", error);
      streamingOptions.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <p>⚠️ Something went wrong. Please check your API key and try again.</p>
        </div>
      `;
    }
  }

  /* -------------------------------------------
     DISPLAY PROVIDERS
  ------------------------------------------- */
  function displayProviders(regionData, region) {
    let html = "";
    const regionLabel = region === "GB" ? "🇬🇧 United Kingdom" : "🇺🇸 United States";

    html += `<div style="grid-column: 1 / -1; margin-bottom: 16px;">
      <p class="small-text">Showing availability for ${regionLabel}</p>
    </div>`;

    if (regionData.flatrate && regionData.flatrate.length > 0) {
      html += `<div style="grid-column: 1 / -1;"><h3 style="margin: 16px 0 12px;">📺 Stream</h3></div>`;
      html += regionData.flatrate.map(provider => {
        const info = getServiceInfo(provider.provider_name);
        return `
          <div class="streaming-option">
            <div class="service-logo">${info.emoji}</div>
            <div class="service-name">${provider.provider_name}</div>
            <div class="service-type">INCLUDED WITH SUBSCRIPTION</div>
          </div>
        `;
      }).join("");
    }

    if (regionData.rent && regionData.rent.length > 0) {
      html += `<div style="grid-column: 1 / -1;"><h3 style="margin: 24px 0 12px;">💰 Rent</h3></div>`;
      html += regionData.rent.map(provider => {
        const info = getServiceInfo(provider.provider_name);
        return `
          <div class="streaming-option">
            <div class="service-logo">${info.emoji}</div>
            <div class="service-name">${provider.provider_name}</div>
            <div class="service-type">RENT</div>
          </div>
        `;
      }).join("");
    }

    if (regionData.buy && regionData.buy.length > 0) {
      html += `<div style="grid-column: 1 / -1;"><h3 style="margin: 24px 0 12px;">🛒 Buy</h3></div>`;
      html += regionData.buy.map(provider => {
        const info = getServiceInfo(provider.provider_name);
        return `
          <div class="streaming-option">
            <div class="service-logo">${info.emoji}</div>
            <div class="service-name">${provider.provider_name}</div>
            <div class="service-type">BUY</div>
          </div>
        `;
      }).join("");
    }

    if (!regionData.flatrate && !regionData.rent && !regionData.buy) {
      html += `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <p>No streaming, rental, or purchase options found for this region.</p>
        </div>
      `;
    }

    html += `
      <div style="grid-column: 1 / -1; text-align: center; margin-top: 24px; padding: 16px;">
        <p class="small-text">Streaming data provided by <a href="https://www.themoviedb.org/" target="_blank" style="color: var(--accent-gold);">TMDb</a> via JustWatch</p>
      </div>
    `;

    streamingOptions.innerHTML = html;
  }

  /* -------------------------------------------
     CHECK WATCHLIST AVAILABILITY
  ------------------------------------------- */
  checkWatchlistBtn.addEventListener("click", async () => {
    const watchlist = JSON.parse(localStorage.getItem("watchlist") || "[]");

    if (watchlist.length === 0) {
      alert("⚠️ Your watchlist is empty!");
      return;
    }

    const tmdbKey = getTmdbKey();
    if (!tmdbKey) {
      alert("⚠️ Please save your TMDb API key first!");
      return;
    }

    watchlistStreamingResults.innerHTML = `<p>Checking availability for ${watchlist.length} movies...</p>`;

    try {
      const results = await Promise.all(
        watchlist.map(async (movie) => {
          const tmdbId = await getTmdbId(movie.imdbID, tmdbKey);
          if (!tmdbId) return { movie, providers: null };

          const providers = await getWatchProviders(tmdbId, tmdbKey);
          const regionData = providers.GB || providers.US || null;
          return { movie, providers: regionData };
        })
      );

      watchlistStreamingResults.innerHTML = `
        <div style="margin-top: 24px;">
          <h3 style="margin-bottom: 16px;">Watchlist Streaming Availability</h3>
          ${results.map(({ movie, providers }) => {
            const streamingNames = providers && providers.flatrate
              ? providers.flatrate.map(p => p.provider_name).join(", ")
              : null;
            const rentNames = providers && providers.rent
              ? providers.rent.slice(0, 3).map(p => p.provider_name).join(", ")
              : null;

            return `
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; margin: 12px 0; display: flex; gap: 16px; align-items: center;">
                <img src="${movie.Poster !== "N/A" ? movie.Poster : placeholder}" alt="${movie.Title}" style="width: 60px; border-radius: 8px;">
                <div>
                  <h4 style="margin-bottom: 4px;">${movie.Title} (${movie.Year})</h4>
                  ${streamingNames
                    ? `<p style="color: #4ecdc4; margin: 4px 0;">📺 Stream on: ${streamingNames}</p>`
                    : `<p style="color: var(--text-secondary); margin: 4px 0;">Not available for streaming</p>`
                  }
                  ${rentNames
                    ? `<p style="color: var(--text-secondary); margin: 4px 0; font-size: 13px;">💰 Rent from: ${rentNames}</p>`
                    : ""
                  }
                </div>
              </div>
            `;
          }).join("")}
          <p class="small-text" style="text-align: center; margin-top: 16px;">Data provided by TMDb via JustWatch</p>
        </div>
      `;
    } catch (error) {
      console.error("Watchlist check failed:", error);
      watchlistStreamingResults.innerHTML = `<p>⚠️ Something went wrong. Please try again.</p>`;
    }
  });

  /* -------------------------------------------
     FILTER BY SERVICE
  ------------------------------------------- */
  serviceButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      serviceButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const tmdbKey = getTmdbKey();
      if (!tmdbKey) {
        serviceResults.innerHTML = `<div style="text-align: center; padding: 40px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; margin-top: 20px;"><p>Please save your TMDb API key to use this feature.</p></div>`;
        return;
      }

      const serviceName = btn.textContent.trim();
      const watchlist = JSON.parse(localStorage.getItem("watchlist") || "[]");
      const recent = JSON.parse(localStorage.getItem("recent") || "[]");
      const allMovies = [...new Map([...watchlist, ...recent].map(m => [m.imdbID, m])).values()];

      if (allMovies.length === 0) {
        serviceResults.innerHTML = `<div style="text-align: center; padding: 40px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; margin-top: 20px;"><p>Add some movies to your watchlist or view some films first!</p></div>`;
        return;
      }

      serviceResults.innerHTML = `<div style="text-align: center; padding: 40px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; margin-top: 20px;"><p>Checking your movies on ${serviceName}...</p></div>`;

      try {
        const matches = [];

        for (const movie of allMovies.slice(0, 15)) {
          const tmdbId = await getTmdbId(movie.imdbID, tmdbKey);
          if (!tmdbId) continue;

          const providers = await getWatchProviders(tmdbId, tmdbKey);
          const regionData = providers.GB || providers.US || null;
          if (!regionData) continue;

          const allProviders = [
            ...(regionData.flatrate || []),
            ...(regionData.rent || []),
            ...(regionData.buy || [])
          ];

          const match = allProviders.find(p =>
            p.provider_name.toLowerCase().includes(btn.dataset.service.toLowerCase())
          );

          if (match) {
            matches.push(movie);
          }
        }

        if (matches.length === 0) {
          serviceResults.innerHTML = `<div style="text-align: center; padding: 40px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; margin-top: 20px;"><h3>No matches</h3><p>None of your movies are currently available on ${serviceName}.</p></div>`;
          return;
        }

        serviceResults.innerHTML = `
          <div style="margin-top: 20px;">
            <h3 style="margin-bottom: 16px;">Your movies on ${serviceName} (${matches.length} found)</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
              ${matches.map(movie => `
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; text-align: center;">
                  <img src="${movie.Poster !== "N/A" ? movie.Poster : placeholder}" alt="${movie.Title}" style="width: 100%; height: 220px; object-fit: cover;">
                  <p style="padding: 12px; font-size: 13px; font-weight: 600;">${movie.Title}</p>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      } catch (error) {
        console.error("Service filter failed:", error);
        serviceResults.innerHTML = `<div style="text-align: center; padding: 40px;"><p>⚠️ Something went wrong. Please try again.</p></div>`;
      }
    });
  });
});