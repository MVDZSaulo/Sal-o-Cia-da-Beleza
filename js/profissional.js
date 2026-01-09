import { auth, db } from "./firebase.js";
import { checkAuth } from "./auth-guard.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let unsubscribe = null;

// Inicializar
checkAuth().then(user => {
  if (!user) return;
  
  verificarRole(user.uid);
  carregarMeusAtendimentos(user.uid);
  
  // Solicitar permissão para notificações
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
});

// ==========================
// 👮 VERIFICAR ROLE
// ==========================
async function verificarRole(uid) {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("__name__", "==", uid));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      if (userData.role !== "profissional") {
        alert("Acesso não autorizado. Esta página é apenas para profissionais.");
        window.location.href = "dashboard.html";
      }
    }
  } catch (error) {
    console.error("Erro ao verificar role:", error);
  }
}

// ==========================
// 📋 CARREGAR MEUS ATENDIMENTOS
// ==========================
function carregarMeusAtendimentos(profissionalId) {
  const listaElement = document.getElementById("listaAtendimentos");
  const noAtendimentos = document.getElementById("noAtendimentos");
  const contadorElement = document.getElementById("contadorAtendimentos");
  
  if (!listaElement) {
    console.error("Elemento listaAtendimentos não encontrado!");
    return;
  }
  
  if (unsubscribe) unsubscribe();
  
  // Buscar atendimentos do profissional logado
  const q = query(
    collection(db, "agendamentos"),
    where("profissionalId", "==", profissionalId),
    where("status", "in", ["pendente", "confirmado", "em_andamento"]),
    orderBy("data"),
    orderBy("hora")
  );
  
  let primeiraCarga = true;
  let contadorPendentes = 0;
  
  unsubscribe = onSnapshot(q, (snapshot) => {
    listaElement.innerHTML = "";
    contadorPendentes = 0;
    
    if (snapshot.empty) {
      if (noAtendimentos) noAtendimentos.style.display = "block";
      if (contadorElement) contadorElement.textContent = "0";
      return;
    }
    
    if (noAtendimentos) noAtendimentos.style.display = "none";
    
    const oggi = new Date().toISOString().split("T")[0];
    
    snapshot.forEach((docSnap) => {
      const dados = doc.data();
      const id = docSnap.id;
      
      // Contar pendentes para notificações
      if (dados.status === "pendente" && !dados.notificado) {
        contadorPendentes++;
        
        // Mostrar notificação para novos agendamentos (após primeira carga)
        if (!primeiraCarga) {
          mostrarNotificacaoAgendamento(dados);
          // Marcar como notificado
          updateDoc(doc(db, "agendamentos", id), {
            notificado: true
          }).catch(console.error);
        }
      }
      
      const card = criarCardAtendimento(id, dados, oggi);
      listaElement.appendChild(card);
    });
    
    // Atualizar contador
    if (contadorElement) {
      contadorElement.textContent = snapshot.size.toString();
      if (contadorPendentes > 0) {
        contadorElement.style.backgroundColor = "#dc3545";
        contadorElement.textContent += ` (${contadorPendentes} novos)`;
      }
    }
    
    primeiraCarga = false;
  }, error => {
    console.error("Erro ao carregar atendimentos:", error);
    listaElement.innerHTML = `
      <div class="alert alert-danger">
        ❌ Erro ao carregar atendimentos. Tente recarregar a página.
      </div>
    `;
  });
}

// ==========================
// 🎨 CRIAR CARD DE ATENDIMENTO
// ==========================
function criarCardAtendimento(id, dados, oggi) {
  const card = document.createElement("div");
  card.className = "card card-atendimento mb-3";
  
  // Destacar atendimentos de hoje
  if (dados.data === oggi) {
    card.classList.add("atendimento-hoje");
  }
  
  // Destacar pendentes
  if (dados.status === "pendente") {
    card.classList.add("atendimento-pendente");
  }
  
  const statusColor = getStatusColor(dados.status);
  const statusText = getStatusText(dados.status);
  const primeiraLetra = dados.cliente ? dados.cliente.charAt(0).toUpperCase() : "C";
  
  card.innerHTML = `
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div class="d-flex align-items-center gap-3">
          <div class="cliente-avatar">${primeiraLetra}</div>
          <div>
            <h5 class="mb-1">${dados.cliente || "Cliente"}</h5>
            <p class="text-muted mb-0">
              <strong>Serviço:</strong> ${dados.servico || "Serviço"}
            </p>
          </div>
        </div>
        <span class="status-badge" style="background-color: ${statusColor}">
          ${statusText}
        </span>
      </div>
      
      <div class="row mb-3">
        <div class="col-md-6">
          <p class="mb-1"><strong>📅 Data:</strong> ${formatarData(dados.data)}</p>
          <p class="mb-1"><strong>⏰ Horário:</strong> ${dados.hora}</p>
        </div>
        <div class="col-md-6">
          ${dados.observacoes ? `
            <p class="mb-1"><strong>📝 Observações:</strong></p>
            <p class="mb-0 text-muted">${dados.observacoes}</p>
          ` : ''}
        </div>
      </div>
      
      <div class="acoes-atendimento">
        ${dados.status === "pendente" ? `
          <button class="btn btn-success btn-lg" onclick="aceitarAtendimento('${id}')">
            ✅ Aceitar Atendimento
          </button>
          <button class="btn btn-danger btn-lg" onclick="recusarAtendimento('${id}')">
            ❌ Recusar
          </button>
        ` : ''}
        
        ${dados.status === "confirmado" ? `
          <button class="btn btn-primary btn-lg" onclick="iniciarAtendimento('${id}')">
            ▶️ Iniciar Atendimento
          </button>
        ` : ''}
        
        ${dados.status === "em_andamento" ? `
          <button class="btn btn-warning btn-lg" onclick="finalizarAtendimento('${id}')">
            ✅ Finalizar Atendimento
          </button>
        ` : ''}
      </div>
    </div>
  `;
  
  return card;
}

// ==========================
// 🔔 MOSTRAR NOTIFICAÇÃO
// ==========================
function mostrarNotificacaoAgendamento(dados) {
  // Notificação do navegador
  if (Notification.permission === "granted") {
    new Notification("📅 Novo Agendamento - Salão Beleza", {
      body: `Cliente: ${dados.cliente}\nServiço: ${dados.servico}\nHorário: ${dados.hora}`,
      icon: "/favicon.ico",
      tag: "novo-agendamento"
    });
  }
  
  // Notificação na página
  const alertContainer = document.getElementById("alertContainer");
  if (alertContainer) {
    const alert = document.createElement("div");
    alert.className = "alert alert-success alert-dismissible fade show";
    alert.innerHTML = `
      <strong>📅 Novo Agendamento Recebido!</strong>

