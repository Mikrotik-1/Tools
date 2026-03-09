// =============================================
// MikroTools - Auth Guard
// أضف في آخر كل صفحة أداة مجانية:
// <script type="module" src="auth.js"></script>
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAfgN8SAIhSU3AN-Az2Kzw2EP-XpptEsN4",
  authDomain: "mikro-tools.firebaseapp.com",
  projectId: "mikro-tools",
  storageBucket: "mikro-tools.firebasestorage.app",
  messagingSenderId: "22698503616",
  appId: "1:22698503616:web:de7a3802b2fd746cc2ec25"
};

document.body.style.visibility = "hidden";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const currentPage = window.location.pathname.split("/").pop();

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html?redirect=" + encodeURIComponent(currentPage);
  } else {
    document.body.style.visibility = "visible";
    const el = document.getElementById("user-email");
    if (el) el.textContent = user.email || user.displayName || "";
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "login.html";
      });
    }
  }
});
