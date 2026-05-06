const apiKey = '5e5feec5';

document.addEventListener("DOMContentLoaded", () => {
  console.log("Social Page Loaded!");

  
  /* -------------------------------------------
     INITIALIZE USER PROFILE
  ------------------------------------------- */
  function initializeProfile() {
    let profile = JSON.parse(localStorage.getItem("userProfile") || "null");
    
    if (!profile) {
      profile = {
        id: generateUserId(),
        username: "Movie Lover",
        bio: "No bio yet - add one!",
        avatar: "🎭",
        shareCode: generateShareCode(),
        createdAt: Date.now()
      };
      localStorage.setItem("userProfile", JSON.stringify(profile));
    }

    return profile;
  }

  function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function generateShareCode() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  const userProfile = initializeProfile();

  /* -------------------------------------------
     RATINGS SYSTEM
  ------------------------------------------- */
  function getRatings() {
    return JSON.parse(localStorage.getItem("movieRatings") || "{}");
  }

  function saveRating(imdbID, rating, review = "") {
    const ratings = getRatings();
    ratings[imdbID] = {
      rating: rating,
      review: review,
      timestamp: Date.now(),
      imdbID: imdbID
    };
    localStorage.setItem("movieRatings", JSON.stringify(ratings));
    
    // Add to activity feed
    addActivity("rated", { imdbID, rating, review });
  }

  function getRating(imdbID) {
    const ratings = getRatings();
    return ratings[imdbID] || null;
  }

  /* -------------------------------------------
     ACTIVITY FEED
  ------------------------------------------- */
  function addActivity(type, data) {
    let activities = JSON.parse(localStorage.getItem("activityFeed") || "[]");
    
    activities.unshift({
      type: type,
      data: data,
      timestamp: Date.now(),
      userId: userProfile.id
    });

    // Keep last 50 activities
    activities = activities.slice(0, 50);
    localStorage.setItem("activityFeed", JSON.stringify(activities));
  }

  /* -------------------------------------------
     FRIENDS SYSTEM
  ------------------------------------------- */
  function getFriends() {
    return JSON.parse(localStorage.getItem("friends") || "[]");
  }

  function addFriend(friendCode, friendData) {
    const friends = getFriends();
    
    if (!friends.some(f => f.shareCode === friendCode)) {
      friends.push({
        shareCode: friendCode,
        username: friendData.username || "Unknown User",
        avatar: friendData.avatar || "🎭",
        addedAt: Date.now()
      });
      localStorage.setItem("friends", JSON.stringify(friends));
      addActivity("added_friend", { friendCode, username: friendData.username });
      return true;
    }
    return false;
  }

  /* -------------------------------------------
     DISPLAY PROFILE
  ------------------------------------------- */
  function displayProfile() {
    document.getElementById("profile-username").textContent = userProfile.username;
    document.getElementById("profile-bio").textContent = userProfile.bio;
    document.getElementById("user-avatar").textContent = userProfile.avatar;
    document.getElementById("user-share-code").value = userProfile.shareCode;

    const ratings = getRatings();
    const reviews = Object.values(ratings).filter(r => r.review && r.review.trim());
    const friends = getFriends();

    document.getElementById("rated-count").textContent = Object.keys(ratings).length;
    document.getElementById("reviews-count").textContent = reviews.length;
    document.getElementById("friends-count").textContent = friends.length;
  }

  displayProfile();

  /* -------------------------------------------
     EDIT PROFILE
  ------------------------------------------- */
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const editProfileModal = document.getElementById("edit-profile-modal");
  const closeEditModal = document.getElementById("close-edit-modal");
  const saveProfileBtn = document.getElementById("save-profile-btn");

  editProfileBtn.addEventListener("click", () => {
    document.getElementById("edit-username").value = userProfile.username;
    document.getElementById("edit-bio").value = userProfile.bio;
    editProfileModal.classList.remove("hidden");
  });

  closeEditModal.addEventListener("click", () => {
    editProfileModal.classList.add("hidden");
  });

  // Emoji picker
  document.querySelectorAll(".emoji-option").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".emoji-option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      userProfile.avatar = btn.dataset.emoji;
    });
  });

  saveProfileBtn.addEventListener("click", () => {
    userProfile.username = document.getElementById("edit-username").value.trim() || "Movie Lover";
    userProfile.bio = document.getElementById("edit-bio").value.trim() || "No bio yet - add one!";
    
    localStorage.setItem("userProfile", JSON.stringify(userProfile));
    displayProfile();
    editProfileModal.classList.add("hidden");
    alert("✅ Profile updated!");
  });

  /* -------------------------------------------
     COPY SHARE CODE
  ------------------------------------------- */
  document.getElementById("copy-code-btn").addEventListener("click", () => {
    const codeInput = document.getElementById("user-share-code");
    codeInput.select();
    document.execCommand("copy");
    alert("📋 Share code copied to clipboard!");
  });

  document.getElementById("regenerate-code-btn").addEventListener("click", () => {
    if (confirm("⚠️ Regenerating your code will invalidate the old one. Friends using the old code won't be able to connect. Continue?")) {
      userProfile.shareCode = generateShareCode();
      localStorage.setItem("userProfile", JSON.stringify(userProfile));
      displayProfile();
      alert("✅ New share code generated!");
    }
  });

  /* -------------------------------------------
     TABS
  ------------------------------------------- */
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      
      btn.classList.add("active");
      const tabName = btn.dataset.tab;
      document.getElementById(`${tabName}-tab`).classList.add("active");

      // Load content based on tab
      if (tabName === "ratings") displayRatings();
      if (tabName === "reviews") displayReviews();
      if (tabName === "friends") displayFriends();
      if (tabName === "activity") displayActivity();
    });
  });

  /* -------------------------------------------
     DISPLAY RATINGS
  ------------------------------------------- */
  async function displayRatings() {
    const ratings = getRatings();
    const filter = document.getElementById("ratings-filter").value;
    
    let filteredRatings = Object.entries(ratings);
    if (filter !== "all") {
      filteredRatings = filteredRatings.filter(([_, data]) => data.rating === parseInt(filter));
    }

    if (filteredRatings.length === 0) {
      document.getElementById("user-ratings-grid").innerHTML = `
        <div style="text-align: center; padding: 60px 20px; grid-column: 1 / -1;">
          <p style="font-size: 18px; color: var(--text-secondary);">No ratings yet. Start rating movies!</p>
        </div>
      `;
      return;
    }

    // Fetch movie details for each rating
    const ratedMovies = await Promise.all(
      filteredRatings.map(async ([imdbID, ratingData]) => {
        const movie = await fetchMovieDetails(imdbID);
        return { ...movie, userRating: ratingData.rating, userReview: ratingData.review };
      })
    );

    const placeholder = "https://via.placeholder.com/300x450?text=No+Image";
    
    document.getElementById("user-ratings-grid").innerHTML = ratedMovies.map(movie => `
      <div class="rated-movie-card">
        <img src="${movie.Poster !== "N/A" ? movie.Poster : placeholder}" alt="${movie.Title}">
        <div class="rated-movie-info">
          <h3>${movie.Title}</h3>
          <div class="rating-display">
            <span class="user-rating">${"⭐".repeat(movie.userRating)}</span>
            <span class="rating-number">${movie.userRating}/5</span>
          </div>
          ${movie.userReview ? `<p class="mini-review">"${movie.userReview}"</p>` : ""}
          <p class="movie-year">${movie.Year} • ${movie.Genre}</p>
        </div>
      </div>
    `).join("");
  }

  document.getElementById("ratings-filter").addEventListener("change", displayRatings);

  /* -------------------------------------------
     DISPLAY REVIEWS
  ------------------------------------------- */
  async function displayReviews() {
    const ratings = getRatings();
    const reviewedMovies = Object.entries(ratings).filter(([_, data]) => data.review && data.review.trim());

    if (reviewedMovies.length === 0) {
      document.getElementById("user-reviews-list").innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <p style="font-size: 18px; color: var(--text-secondary);">No reviews yet. Add reviews when rating movies!</p>
        </div>
      `;
      return;
    }

    const reviewsWithDetails = await Promise.all(
      reviewedMovies.map(async ([imdbID, ratingData]) => {
        const movie = await fetchMovieDetails(imdbID);
        return { ...movie, ...ratingData };
      })
    );

    const placeholder = "https://via.placeholder.com/300x450?text=No+Image";

    document.getElementById("user-reviews-list").innerHTML = reviewsWithDetails.map(movie => `
      <div class="review-card">
        <div class="review-header">
          <img src="${movie.Poster !== "N/A" ? movie.Poster : placeholder}" class="review-poster" alt="${movie.Title}">
          <div class="review-meta">
            <h3>${movie.Title} (${movie.Year})</h3>
            <div class="rating-display">
              <span class="user-rating">${"⭐".repeat(movie.rating)}</span>
              <span class="rating-number">${movie.rating}/5</span>
            </div>
            <p class="review-date">${new Date(movie.timestamp).toLocaleDateString()}</p>
          </div>
        </div>
        <div class="review-text">
          <p>${movie.review}</p>
        </div>
      </div>
    `).join("");
  }

  /* -------------------------------------------
     DISPLAY FRIENDS
  ------------------------------------------- */
  function displayFriends() {
    const friends = getFriends();

    if (friends.length === 0) {
      document.getElementById("friends-list").innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <p style="font-size: 18px; color: var(--text-secondary);">No friends yet. Share your code or add friends!</p>
        </div>
      `;
      return;
    }

    document.getElementById("friends-list").innerHTML = friends.map(friend => `
      <div class="friend-card">
        <div class="friend-avatar">${friend.avatar}</div>
        <div class="friend-info">
          <h3>${friend.username}</h3>
          <p class="friend-code">Code: ${friend.shareCode}</p>
          <p class="friend-date">Friends since ${new Date(friend.addedAt).toLocaleDateString()}</p>
        </div>
        <button class="secondary-btn view-friend-btn" data-code="${friend.shareCode}">View Profile</button>
      </div>
    `).join("");
  }

  /* -------------------------------------------
     ADD FRIEND
  ------------------------------------------- */
  document.getElementById("add-friend-btn").addEventListener("click", () => {
    const code = document.getElementById("friend-code-input").value.trim().toUpperCase();
    
    if (!code) {
      alert("⚠️ Please enter a friend code!");
      return;
    }

    if (code === userProfile.shareCode) {
      alert("⚠️ You can't add yourself as a friend!");
      return;
    }

    // In a real app, this would fetch from a server
    // For demo, we'll create a mock friend profile
    const mockFriend = {
      username: `User_${code.substr(0, 4)}`,
      avatar: "🎬"
    };

    if (addFriend(code, mockFriend)) {
      alert("✅ Friend added successfully!");
      document.getElementById("friend-code-input").value = "";
      displayProfile();
      displayFriends();
    } else {
      alert("⚠️ Friend already added or code invalid!");
    }
  });

  /* -------------------------------------------
     DISPLAY ACTIVITY
  ------------------------------------------- */
  async function displayActivity() {
    const activities = JSON.parse(localStorage.getItem("activityFeed") || "[]");

    if (activities.length === 0) {
      document.getElementById("activity-feed").innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <p style="font-size: 18px; color: var(--text-secondary);">No activity yet. Start rating and reviewing movies!</p>
        </div>
      `;
      return;
    }

    const activitiesHTML = await Promise.all(
      activities.slice(0, 20).map(async (activity) => {
        const timeAgo = getTimeAgo(activity.timestamp);
        
        if (activity.type === "rated") {
          const movie = await fetchMovieDetails(activity.data.imdbID);
          return `
            <div class="activity-item">
              <div class="activity-icon">⭐</div>
              <div class="activity-content">
                <p><strong>You</strong> rated <strong>${movie.Title}</strong> ${"⭐".repeat(activity.data.rating)}</p>
                ${activity.data.review ? `<p class="activity-review">"${activity.data.review}"</p>` : ""}
                <span class="activity-time">${timeAgo}</span>
              </div>
            </div>
          `;
        }

        if (activity.type === "added_friend") {
          return `
            <div class="activity-item">
              <div class="activity-icon">👥</div>
              <div class="activity-content">
                <p><strong>You</strong> connected with <strong>${activity.data.username}</strong></p>
                <span class="activity-time">${timeAgo}</span>
              </div>
            </div>
          `;
        }

        return "";
      })
    );

    document.getElementById("activity-feed").innerHTML = activitiesHTML.join("");
  }

  function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  /* -------------------------------------------
     EXPORT & IMPORT
  ------------------------------------------- */
  document.getElementById("export-profile-btn").addEventListener("click", () => {
    const exportData = {
      profile: userProfile,
      ratings: getRatings(),
      watchlist: JSON.parse(localStorage.getItem("watchlist") || "[]"),
      recentlyViewed: JSON.parse(localStorage.getItem("recent") || "[]"),
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cinescope-profile-${userProfile.shareCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert("✅ Profile exported!");
  });

  document.getElementById("export-ratings-btn").addEventListener("click", () => {
    const exportData = {
      username: userProfile.username,
      ratings: getRatings(),
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cinescope-ratings-${userProfile.shareCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert("✅ Ratings exported!");
  });

  document.getElementById("import-btn").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });

  document.getElementById("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        if (data.profile && data.ratings) {
          // Full profile import
          if (confirm("⚠️ Import this profile? This will not overwrite your current profile, but you can view their data.")) {
            alert(`📥 Viewing ${data.profile.username}'s profile!\n\nRatings: ${Object.keys(data.ratings).length}\nWatchlist: ${data.watchlist?.length || 0}`);
          }
        } else if (data.ratings) {
          // Ratings only
          alert(`📥 Imported ${Object.keys(data.ratings).length} ratings from ${data.username}!`);
        }
      } catch (error) {
        alert("❌ Invalid file format!");
      }
    };
    reader.readAsText(file);
  });

  /* -------------------------------------------
     GENERATE SHARE TEXT
  ------------------------------------------- */
  document.getElementById("generate-share-link").addEventListener("click", () => {
    const ratings = getRatings();
    const watchlist = JSON.parse(localStorage.getItem("watchlist") || "[]");
    const topRated = Object.values(ratings).sort((a, b) => b.rating - a.rating).slice(0, 3);

    const shareText = `
🎬 ${userProfile.username}'s CineScope Profile

📊 Stats:
• ${Object.keys(ratings).length} movies rated
• ${watchlist.length} in watchlist
• ${Object.values(ratings).filter(r => r.review).length} reviews written

⭐ Top Rated Movies:
${topRated.length > 0 ? topRated.map(r => `• ${r.rating}/5 stars`).join('\n') : '• No ratings yet'}

🔗 Connect with me: ${userProfile.shareCode}
    `.trim();

    const outputDiv = document.getElementById("share-text-output");
    outputDiv.innerHTML = `
      <textarea rows="10" style="width: 100%; padding: 16px; margin-top: 16px; border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color);">${shareText}</textarea>
      <button id="copy-share-text" class="secondary-btn" style="margin-top: 12px;">📋 Copy Text</button>
    `;
    outputDiv.classList.remove("hidden");

    setTimeout(() => {
      document.getElementById("copy-share-text").addEventListener("click", () => {
        const textarea = outputDiv.querySelector("textarea");
        textarea.select();
        document.execCommand("copy");
        alert("📋 Copied to clipboard!");
      });
    }, 100);
  });

  /* -------------------------------------------
     HELPER: FETCH MOVIE DETAILS
  ------------------------------------------- */
  async function fetchMovieDetails(imdbID) {
    const cacheKey = `movie_${imdbID}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return parsed.data;
      }
    }

    const url = `https://www.omdbapi.com/?apikey=${apiKey}&i=${imdbID}`;
    const response = await fetch(url);
    const data = await response.json();
    
    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: data
    }));
    
    return data;
  }

  // Initialize first tab
  displayRatings();
});

// Export rating function for use in other pages
window.CineScopeRating = {
  saveRating: function(imdbID, rating, review = "") {
    const ratings = JSON.parse(localStorage.getItem("movieRatings") || "{}");
    ratings[imdbID] = {
      rating: rating,
      review: review,
      timestamp: Date.now(),
      imdbID: imdbID
    };
    localStorage.setItem("movieRatings", JSON.stringify(ratings));
  },
  getRating: function(imdbID) {
    const ratings = JSON.parse(localStorage.getItem("movieRatings") || "{}");
    return ratings[imdbID] || null;
  }
};