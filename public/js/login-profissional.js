
import { auth, db } from "./firebase.js";
import {
    signInWithEmailAndPassword,
    signOut,
    setPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("loginForm");
const errorElement = document.getElementById("errorMessage");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Show Loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Verificando...";
        submitBtn.disabled = true;
        errorElement.classList.add('hidden');

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("password").value;

        try {
            // 1. Set Persistence
            await setPersistence(auth, browserSessionPersistence);

            // 2. Login
            const cred = await signInWithEmailAndPassword(auth, email, senha);
            const uid = cred.user.uid;

            // 2. Check Role
            const ref = doc(db, "users", uid);
            const snap = await getDoc(ref);

            if (!snap.exists()) {
                throw new Error("Perfil não encontrado.");
            }

            const userData = snap.data();

            if (userData.role === 'profissional') {
                // Success
                window.location.href = "profissional.html";
            } else {
                // Unauthorized Role
                await signOut(auth);
                throw new Error("Acesso restrito. Este login é apenas para profissionais. Use o login administrativo.");
            }

        } catch (err) {
            console.error("Erro no login:", err);
            errorElement.textContent = err.message || "Erro ao fazer login.";
            errorElement.classList.remove("hidden");

            // Reset Button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

            // If valid auth but wrong role, ensure logout
            if (auth.currentUser) {
                await signOut(auth);
            }
        }
    });
}
