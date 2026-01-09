import { auth, onAuthStateChanged, getUserRole } from './firebase.js';

const publicPages = ['index.html', 'cadastro.html', 'login.html', '/'];

function isPublicPage() {
  const path = window.location.pathname;
  return publicPages.some(page => path.endsWith(page));
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (!isPublicPage()) {
      console.log("No user found, redirecting to login.");
      window.location.href = 'index.html';
    }
  } else {
    if (isPublicPage()) {
      // If user is logged in and tries to access login page, redirect to dashboard
      const role = await getUserRole(user.uid);
      if (role === 'admin') {
        window.location.href = 'dashboard.html';
      } else if (role === 'profissional') {
        window.location.href = 'profissional.html';
      } else {
        window.location.href = 'agendamento.html';
      }
    }
  }
});

// Export for manual checks if needed
export async function requireRole(allowedRoles) {
  const user = auth.currentUser;
  if (!user) return; // onAuthStateChanged will handle redirect

  const role = await getUserRole(user.uid);
  if (!allowedRoles.includes(role)) {
    console.warn(`User role ${role} not authorized. Expected: ${allowedRoles.join(', ')}`);
    alert('Acesso negado.');
    window.history.back();
  }
}