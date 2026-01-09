import { auth, signInWithEmailAndPassword, getUserRole, signOut } from './firebase.js';
import { setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = loginForm.querySelector('button[type="submit"]');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset verify state
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        // Set persistence to SESSION (Isolated to current tab)
        await setPersistence(auth, browserSessionPersistence);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("Login success:", user.uid);

        // Check role and redirect
        const role = await getUserRole(user.uid, user.email);

        switch (role) {
            case 'admin':
                window.location.href = 'dashboard.html';
                break;
            case 'profissional':
                await signOut(auth);
                errorMessage.textContent = 'Acesso restrito para profissionais. Utilize a Área do Profissional.';
                errorMessage.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar';
                return;
            default:
                // Default fallback or client view
                window.location.href = 'agendamento.html';
        }

    } catch (error) {
        console.error("Login Error:", error);
        errorMessage.classList.remove('hidden');

        switch (error.code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage.textContent = 'Email ou senha incorretos.';
                break;
            case 'auth/too-many-requests':
                errorMessage.textContent = 'Muitas tentativas. Tente novamente mais tarde.';
                break;
            default:
                errorMessage.textContent = 'Ocorreu um erro ao tentar entrar. Tente novamente.';
        }

        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
    }
});
