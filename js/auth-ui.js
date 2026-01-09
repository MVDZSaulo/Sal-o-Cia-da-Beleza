
import { auth } from "./firebase.js";
import {
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  const emailEl = document.getElementById("userEmail");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user && emailEl) {
    emailEl.textContent = user.email;
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        await signOut(auth);
        window.location.href = "index.html";
      } catch (err) {
        console.error("Erro ao sair:", err);
      }
    };
  }
});