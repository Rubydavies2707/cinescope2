/* -------------------------------------------
   FIRESTORE HELPER - CineScope
   Wraps all Firestore read/write operations.
   Falls back to localStorage if user not logged in.
------------------------------------------- */

/* -------------------------------------------
   PROFILE
------------------------------------------- */
async function saveProfileToFirestore(profile) {
    const user = auth.currentUser;
    if (!user) return false;
  
    try {
      await db.collection("users").doc(user.uid).set({
        displayName: profile.username || "Movie Lover",
        bio: profile.bio || "",
        avatar: profile.avatar || "🎭",
        shareCode: profile.shareCode,
        updatedAt: Date.now()
      }, { merge: true });
  
      // Also save shareCode → uid lookup so friends can find us
      await db.collection("shareCodes").doc(profile.shareCode).set({
        uid: user.uid
      });
  
      return true;
    } catch (error) {
      console.error("saveProfileToFirestore failed:", error);
      return false;
    }
  }
  
  async function loadProfileFromFirestore() {
    const user = auth.currentUser;
    if (!user) return null;
  
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (doc.exists) return doc.data();
      return null;
    } catch (error) {
      console.error("loadProfileFromFirestore failed:", error);
      return null;
    }
  }
  
  /* -------------------------------------------
     FIND USER BY SHARE CODE (for adding friends)
  ------------------------------------------- */
  async function findUserByShareCode(code) {
    try {
      const lookupDoc = await db.collection("shareCodes").doc(code).get();
      if (!lookupDoc.exists) return null;
  
      const uid = lookupDoc.data().uid;
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) return null;
  
      return { uid, ...userDoc.data() };
    } catch (error) {
      console.error("findUserByShareCode failed:", error);
      return null;
    }
  }
  
  /* -------------------------------------------
     FRIENDS
  ------------------------------------------- */
  async function addFriendToFirestore(friendUid, friendData) {
    const user = auth.currentUser;
    if (!user) return false;
  
    try {
      await db.collection("users").doc(user.uid)
        .collection("friends").doc(friendUid).set({
          friendUid: friendUid,
          displayName: friendData.displayName,
          avatar: friendData.avatar,
          shareCode: friendData.shareCode,
          addedAt: Date.now()
        });
      return true;
    } catch (error) {
      console.error("addFriendToFirestore failed:", error);
      return false;
    }
  }
  
  async function loadFriendsFromFirestore() {
    const user = auth.currentUser;
    if (!user) return [];
  
    try {
      const snapshot = await db.collection("users").doc(user.uid)
        .collection("friends").get();
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error("loadFriendsFromFirestore failed:", error);
      return [];
    }
  }
  
  async function removeFriendFromFirestore(friendUid) {
    const user = auth.currentUser;
    if (!user) return false;
  
    try {
      await db.collection("users").doc(user.uid)
        .collection("friends").doc(friendUid).delete();
      return true;
    } catch (error) {
      console.error("removeFriendFromFirestore failed:", error);
      return false;
    }
  }
  
  /* -------------------------------------------
     RATINGS & REVIEWS
  ------------------------------------------- */
  async function saveRatingToFirestore(imdbID, rating, review, movieData) {
    const user = auth.currentUser;
    if (!user) return false;
  
    try {
      await db.collection("users").doc(user.uid)
        .collection("ratings").doc(imdbID).set({
          imdbID: imdbID,
          rating: rating,
          review: review || "",
          title: movieData?.Title || "",
          poster: movieData?.Poster || "",
          year: movieData?.Year || "",
          timestamp: Date.now()
        });
      return true;
    } catch (error) {
      console.error("saveRatingToFirestore failed:", error);
      return false;
    }
  }
  
  async function loadRatingsFromFirestore(userUid = null) {
    const targetUid = userUid || auth.currentUser?.uid;
    if (!targetUid) return {};
  
    try {
      const snapshot = await db.collection("users").doc(targetUid)
        .collection("ratings").get();
      const ratings = {};
      snapshot.docs.forEach(doc => {
        ratings[doc.id] = doc.data();
      });
      return ratings;
    } catch (error) {
      console.error("loadRatingsFromFirestore failed:", error);
      return {};
    }
  }
  
  /* -------------------------------------------
     FRIENDS' RATINGS (for social feed)
  ------------------------------------------- */
  async function loadFriendsRatings() {
    const friends = await loadFriendsFromFirestore();
    const allFriendsRatings = [];
  
    for (const friend of friends) {
      const ratings = await loadRatingsFromFirestore(friend.friendUid);
      Object.values(ratings).forEach(rating => {
        allFriendsRatings.push({
          ...rating,
          friendName: friend.displayName,
          friendAvatar: friend.avatar,
          friendUid: friend.friendUid
        });
      });
    }
  
    // Sort newest first
    allFriendsRatings.sort((a, b) => b.timestamp - a.timestamp);
    return allFriendsRatings;
  }
  
  /* -------------------------------------------
     WATCHLIST
  ------------------------------------------- */
  async function saveWatchlistItemToFirestore(movie) {
    const user = auth.currentUser;
    if (!user) return false;
  
    try {
      await db.collection("users").doc(user.uid)
        .collection("watchlist").doc(movie.imdbID).set({
          imdbID: movie.imdbID,
          title: movie.Title,
          poster: movie.Poster,
          year: movie.Year,
          addedAt: Date.now()
        });
      return true;
    } catch (error) {
      console.error("saveWatchlistItemToFirestore failed:", error);
      return false;
    }
  }
  
  async function removeWatchlistItemFromFirestore(imdbID) {
    const user = auth.currentUser;
    if (!user) return false;
  
    try {
      await db.collection("users").doc(user.uid)
        .collection("watchlist").doc(imdbID).delete();
      return true;
    } catch (error) {
      console.error("removeWatchlistItemFromFirestore failed:", error);
      return false;
    }
  }
  
  async function loadWatchlistFromFirestore() {
    const user = auth.currentUser;
    if (!user) return [];
  
    try {
      const snapshot = await db.collection("users").doc(user.uid)
        .collection("watchlist").get();
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error("loadWatchlistFromFirestore failed:", error);
      return [];
    }
  }