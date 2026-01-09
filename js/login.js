
import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("loginForm");
const msgElement = document.getElementById("msg");

if (!form) {
  console.error("Formulário loginForm não encontrado");
} else {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Mostrar loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Entrando...";
    submitBtn.disabled = true;
    
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    try {
      // 1️⃣ Login com Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      const uid = cred.user.uid;

      // 2️⃣ Buscar usuário no Firestore
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        throw new Error("Perfil não encontrado no sistema");
      }

     const userData = snap.data();
const role = userData.role;

console.log("Login bem-sucedido:", { email, role });

// 3️⃣ Redirecionamento baseado no papel (role)
if (role === "admin" || role === "recepcao") {
    window.location.href = "dashboard.html";
} 
else if (role === "profissional") {
    window.location.href = "profissional.html";
}
else {
    alert("Perfil sem permissões definidas. Contate o administrador.");
}

      console.log("Login bem-sucedido:", { email, role });

      // 3️⃣ Redirecionamento baseado no papel (role)
      if (role === "admin" || role === "recepcao") {
        window.location.href = "dashboard.html";
      } 
      else if (role === "profissional") {
        window.location.href = "profissional.html";
      }
      else {
        alert("Perfil sem permissões definidas. Contate o administrador.");
      }

    } catch (err) {
      console.error("Erro no login:", err);
      
      // Mostrar mensagem de erro
      if (msgElement) {
        msgElement.textContent = "Erro no login: " + err.message;
        msgElement.className = "alert alert-danger";
        msgElement.classList.remove("d-none");
      } else {
        alert("Erro no login: " + err.message);
      }
      
      // Reativar botão em caso de erro
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Limpar mensagem de erro ao começar a digitar
['email', 'senha'].forEach(id => {
  const field = document.getElementById(id);
  if (field) {
    field.addEventListener('input', () => {
      if (msgElement && !msgElement.classList.contains('d-none')) {
        msgElement.classList.add('d-none');
      }
    });
  }
});
