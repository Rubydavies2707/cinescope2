/* -------------------------------------------
   FIREBASE AUTH - CineScope
   Handles initialization, login, register,
   logout, and auth state management.
------------------------------------------- */

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBtuYX5DVuVMuuPa9GBQAcPTGetq69qN5M",
  authDomain: "cinescope-466e5.firebaseapp.com",
  projectId: "cinescope-466e5",
  storageBucket: "cinescope-466e5.firebasestorage.app",
  messagingSenderId: "918196875040",
  appId: "1:918196875040:web:f4f2ef70c709002db0f145"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* -------------------------------------------
   AUTH STATE LISTENER
   Runs on every page to check if user is
   logged in and update the navbar accordingly.
------------------------------------------- */
auth.onAuthStateChanged((user) => {
  const navButtons = document.getElementById("nav-buttons");
  if (!navButtons) return;

  if (user) {
    // User is logged in
    const displayName = user.displayName || user.email.split("@")[0];

    // Remove login link if it exists
    const loginLink = document.getElementById("login-link");
    if (loginLink) loginLink.remove();

    // Remove guest exit button if it exists
    const guestExitBtn = document.getElementById("guest-exit-btn");
    if (guestExitBtn) guestExitBtn.remove();
    const guestDisplay = document.getElementById("guest-display");
    if (guestDisplay) guestDisplay.remove();

    // Check if auth buttons already exist
    if (!document.getElementById("user-display")) {
      // Add username display and logout button
      const userSpan = document.createElement("span");
      userSpan.id = "user-display";
      userSpan.textContent = `👤 ${displayName}`;
      userSpan.style.cssText = "color: var(--accent-gold); font-weight: 600; font-size: 14px; padding: 8px 16px;";

      const logoutBtn = document.createElement("button");
      logoutBtn.id = "logout-btn";
      logoutBtn.className = "secondary-btn";
      logoutBtn.textContent = "Logout";
      logoutBtn.onclick = () => {
        auth.signOut().then(() => {
          window.location.href = "login.html";
        });
      };

      // Insert before watchlist button
      const watchlistBtn = document.getElementById("view-watchlist");
      navButtons.insertBefore(userSpan, watchlistBtn);
      navButtons.insertBefore(logoutBtn, watchlistBtn);
    }
  } else {
    // User is not logged in
    // Remove user display and logout if they exist
    const userDisplay = document.getElementById("user-display");
    const logoutBtn = document.getElementById("logout-btn");
    if (userDisplay) userDisplay.remove();
    if (logoutBtn) logoutBtn.remove();

    const currentPage = window.location.pathname.split("/").pop();
    const isGuest = localStorage.getItem("guestMode") === "true";

    if (isGuest) {
      // Show guest indicator + exit guest mode button
      if (!document.getElementById("guest-display")) {
        const guestSpan = document.createElement("span");
        guestSpan.id = "guest-display";
        guestSpan.textContent = "👤 Guest";
        guestSpan.style.cssText = "color: var(--text-secondary); font-weight: 600; font-size: 14px; padding: 8px 16px;";

        const exitGuestBtn = document.createElement("button");
        exitGuestBtn.id = "guest-exit-btn";
        exitGuestBtn.className = "secondary-btn";
        exitGuestBtn.textContent = "Exit Guest Mode";
        exitGuestBtn.onclick = () => {
          localStorage.removeItem("guestMode");
          window.location.href = "login.html";
        };

        const watchlistBtn = document.getElementById("view-watchlist");
        if (watchlistBtn && navButtons) {
          navButtons.insertBefore(guestSpan, watchlistBtn);
          navButtons.insertBefore(exitGuestBtn, watchlistBtn);
        }
      }
    } else {
      // Show login button if not on login page
      if (currentPage !== "login.html" && !document.getElementById("login-link")) {
        const loginBtn = document.createElement("a");
        loginBtn.id = "login-link";
        loginBtn.href = "login.html";
        loginBtn.className = "primary-btn";
        loginBtn.textContent = "Sign In";
        loginBtn.style.textDecoration = "none";
  
        const watchlistBtn = document.getElementById("view-watchlist");
        if (watchlistBtn && navButtons) {
          navButtons.insertBefore(loginBtn, watchlistBtn);
        }
      }
    }
  }
});

/* -------------------------------------------
   AUTH HELPER FUNCTIONS
------------------------------------------- */

// Register a new user
async function registerUser(email, password, displayName) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);

    // Set display name
    await userCredential.user.updateProfile({
      displayName: displayName
    });

    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

// Login an existing user
async function loginUser(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

// Logout
async function logoutUser() {
  try {
    await auth.signOut();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get current user
function getCurrentUser() {
  return auth.currentUser;
}

// Check if user is logged in
function isLoggedIn() {
  return auth.currentUser !== null;
}

// Friendly error messages
function getAuthErrorMessage(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-credential":
      return "Incorrect email or password. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a moment and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}