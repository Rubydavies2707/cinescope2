const apiKey = '5e5feec5';

// Helper to scope localStorage keys to the current user
function getUserKey(key) {
  const userId = (typeof auth !== 'undefined' && auth.currentUser) 
    ? auth.currentUser.uid 
    : 'guest';
  return `${key}_${userId}`;
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Analytics Page Loaded!");

 // Load data
  const recentlyViewed = JSON.parse(localStorage.getItem(getUserKey("recent")) || "[]");
  const watchlist = JSON.parse(localStorage.getItem(getUserKey("watchlist")) || "[]");

  /* -------------------------------------------
     STATS OVERVIEW
  ------------------------------------------- */
  function calculateStats() {
    document.getElementById("total-viewed").textContent = recentlyViewed.length;
    document.getElementById("watchlist-count").textContent = watchlist.length;

    // Calculate favorite genre
    const genreCounts = {};
    recentlyViewed.forEach(movie => {
      if (movie.Genre) {
        const genres = movie.Genre.split(", ");
        genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });

    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("top-genre").textContent = topGenre ? topGenre[0] : "N/A";

    // Calculate average runtime
    let totalRuntime = 0;
    let count = 0;
    recentlyViewed.forEach(movie => {
      if (movie.Runtime) {
        const runtime = parseInt(movie.Runtime);
        if (!isNaN(runtime)) {
          totalRuntime += runtime;
          count++;
        }
      }
    });

    const avgRuntime = count > 0 ? Math.round(totalRuntime / count) : 0;
    document.getElementById("avg-runtime").textContent = avgRuntime > 0 ? `${avgRuntime} min` : "N/A";
  }

  calculateStats();

  /* -------------------------------------------
     CHARTS
  ------------------------------------------- */
  const isDark = document.body.classList.contains("dark");
  const textColor = isDark ? "#ffffff" : "#1a1a1a";
  const gridColor = isDark ? "#3a3a3a" : "#dee2e6";
  const goldColor = "#d4af37";
  const amberColor = "#ff9500";

  // Genre Distribution Chart
  function createGenreChart() {
    const genreCounts = {};
    recentlyViewed.forEach(movie => {
      if (movie.Genre) {
        const genres = movie.Genre.split(", ");
        genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });

    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const ctx = document.getElementById("genre-chart").getContext("2d");
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: sortedGenres.map(g => g[0]),
        datasets: [{
          data: sortedGenres.map(g => g[1]),
          backgroundColor: [
            goldColor,
            amberColor,
            "#ff6b6b",
            "#4ecdc4",
            "#45b7d1",
            "#96ceb4",
            "#ffeaa7",
            "#dfe6e9"
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: textColor, font: { size: 12 } }
          }
        }
      }
    });
  }

  // Timeline Chart
  function createTimelineChart() {
    const timelineCounts = {};
    
    recentlyViewed.forEach(movie => {
      const date = movie.viewedDate ? new Date(movie.viewedDate) : new Date();
      const monthYear = `${date.toLocaleString("en-GB", { month: "short" })} ${date.getFullYear()}`;
      timelineCounts[monthYear] = (timelineCounts[monthYear] || 0) + 1;
    });

    const sortedMonths = Object.entries(timelineCounts).sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      return dateA - dateB;
    });

    const months = sortedMonths.map(m => m[0]);
    const counts = sortedMonths.map(m => m[1]);

    const ctx = document.getElementById("timeline-chart").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: months,
        datasets: [{
          label: "Movies Viewed",
          data: counts,
          borderColor: goldColor,
          backgroundColor: `${goldColor}33`,
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: { color: textColor }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  // Rating Distribution Chart
  function createRatingChart() {
    const ratingRanges = {
      "9.0 - 10": 0,
      "8.0 - 8.9": 0,
      "7.0 - 7.9": 0,
      "6.0 - 6.9": 0,
      "< 6.0": 0
    };

    recentlyViewed.forEach(movie => {
      if (movie.imdbRating) {
        const rating = parseFloat(movie.imdbRating);
        if (rating >= 9) ratingRanges["9.0 - 10"]++;
        else if (rating >= 8) ratingRanges["8.0 - 8.9"]++;
        else if (rating >= 7) ratingRanges["7.0 - 7.9"]++;
        else if (rating >= 6) ratingRanges["6.0 - 6.9"]++;
        else ratingRanges["< 6.0"]++;
      }
    });

    const ctx = document.getElementById("rating-chart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(ratingRanges),
        datasets: [{
          label: "Number of Movies",
          data: Object.values(ratingRanges),
          backgroundColor: goldColor,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          x: {
            ticks: { color: textColor },
            grid: { display: false }
          }
        }
      }
    });
  }

  // Decade Breakdown Chart
  function createDecadeChart() {
    const decadeCounts = {};

    recentlyViewed.forEach(movie => {
      if (movie.Year) {
        const year = parseInt(movie.Year);
        const decade = Math.floor(year / 10) * 10;
        decadeCounts[`${decade}s`] = (decadeCounts[`${decade}s`] || 0) + 1;
      }
    });

    const sortedDecades = Object.entries(decadeCounts)
      .sort((a, b) => a[0].localeCompare(b[0]));

    const ctx = document.getElementById("decade-chart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedDecades.map(d => d[0]),
        datasets: [{
          label: "Movies per Decade",
          data: sortedDecades.map(d => d[1]),
          backgroundColor: amberColor,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          x: {
            ticks: { color: textColor },
            grid: { display: false }
          }
        }
      }
    });
  }

  if (recentlyViewed.length > 0) {
    createGenreChart();
    createTimelineChart();
    createRatingChart();
    createDecadeChart();
  }

  /* -------------------------------------------
     TOP LISTS
  ------------------------------------------- */
  function createTopRatedList() {
    const topRated = [...recentlyViewed]
      .filter(m => m.imdbRating)
      .sort((a, b) => parseFloat(b.imdbRating) - parseFloat(a.imdbRating))
      .slice(0, 5);

    const html = topRated.map(movie => `
      <div class="list-item">
        <span class="list-item-name">${movie.Title}</span>
        <span class="list-item-value">${movie.imdbRating}/10</span>
      </div>
    `).join("");

    document.getElementById("top-rated-list").innerHTML = html || "<p>No data yet</p>";
  }

  function createTopDirectorsList() {
    const directorCounts = {};
    
    recentlyViewed.forEach(movie => {
      if (movie.Director && movie.Director !== "N/A") {
        const directors = movie.Director.split(", ");
        directors.forEach(director => {
          directorCounts[director] = (directorCounts[director] || 0) + 1;
        });
      }
    });

    const topDirectors = Object.entries(directorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const html = topDirectors.map(([name, count]) => `
      <div class="list-item">
        <span class="list-item-name">${name}</span>
        <span class="list-item-value">${count} movie${count > 1 ? 's' : ''}</span>
      </div>
    `).join("");

    document.getElementById("top-directors-list").innerHTML = html || "<p>No data yet</p>";
  }

  function createTopActorsList() {
    const actorCounts = {};
    
    recentlyViewed.forEach(movie => {
      if (movie.Actors && movie.Actors !== "N/A") {
        const actors = movie.Actors.split(", ");
        actors.forEach(actor => {
          actorCounts[actor] = (actorCounts[actor] || 0) + 1;
        });
      }
    });

    const topActors = Object.entries(actorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const html = topActors.map(([name, count]) => `
      <div class="list-item">
        <span class="list-item-name">${name}</span>
        <span class="list-item-value">${count} movie${count > 1 ? 's' : ''}</span>
      </div>
    `).join("");

    document.getElementById("top-actors-list").innerHTML = html || "<p>No data yet</p>";
  }

  createTopRatedList();
  createTopDirectorsList();
  createTopActorsList();

  /* -------------------------------------------
     EXPORT FUNCTIONS
  ------------------------------------------- */
  document.getElementById("export-json").onclick = () => {
    const data = {
      recentlyViewed,
      watchlist,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cinescope-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById("export-csv").onclick = () => {
    const allMovies = [...new Set([...recentlyViewed, ...watchlist])];
    
    const csv = [
      ["Title", "Year", "Genre", "Director", "IMDB Rating", "Runtime"],
      ...allMovies.map(m => [
        m.Title,
        m.Year,
        m.Genre || "N/A",
        m.Director || "N/A",
        m.imdbRating || "N/A",
        m.Runtime || "N/A"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cinescope-movies-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
});