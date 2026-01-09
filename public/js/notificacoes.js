import { db } from "./firebase.js";
import { checkAuth } from "./auth-guard.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Variáveis globais
let audioNotificacao = null;
let notificacaoTimeout = null;

// Inicializar sistema de notificações
export async function iniciarSistemaNotificacoes() {
  const user = await checkAuth();
  if (!user) return;

  // Criar elemento de áudio
  audioNotificacao = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-classic-alarm-995.mp3');
  audioNotificacao.volume = 0.5;

  // Solicitar permissão para notificações
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // Monitorar agendamentos do profissional
  monitorarAgendamentos(user.uid);
}

// Monitorar agendamentos em tempo real
function monitorarAgendamentos(profissionalId) {
  const q = query(
    collection(db, "agendamentos"),
    where("profissionalId", "==", profissionalId),
    where("status", "in", ["agendado", "em atendimento"]),
    orderBy("data"),
    orderBy("hora")
  );

  let primeiraCarga = true;

  onSnapshot(q, (snapshot) => {
    // Ignorar primeira carga
    if (primeiraCarga) {
      primeiraCarga = false;
      return;
    }

    // Verificar novos agendamentos
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const agendamento = change.doc.data();
        
        // Verificar se é para hoje
        const hoje = new Date().toISOString().split("T")[0];
        if (agendamento.data === hoje) {
          mostrarNotificacao(agendamento);
        }
      }
    });

    // Atualizar lista de atendimentos
    atualizarListaAtendimentos(snapshot);
  });
}

// Mostrar notificação com som
function mostrarNotificacao(agendamento) {
  // Tocar som
  if (audioNotificacao) {
    audioNotificacao.currentTime = 0;
    audioNotificacao.play().catch(e => console.log("Erro ao tocar som:", e));
  }

  // Mostrar notificação do navegador
  if (Notification.permission === "granted") {
    const notificacao = new Notification("📅 Novo Agendamento - Salão Beleza", {
      body: `Cliente: ${agendamento.nome}\nServiço: ${agendamento.servico}\nHorário: ${agendamento.hora}`,
      icon: "/favicon.ico",
      tag: "novo-agendamento"
    });

    notificacao.onclick = () => {
      window.focus();
      notificacao.close();
    };
  }

  // Mostrar popup personalizado
  mostrarPopupNotificacao(agendamento);
}

// Popup personalizado
function mostrarPopupNotificacao(agendamento) {
  // Remover popup anterior se existir
  const popupAnterior = document.getElementById('popup-notificacao');
  if (popupAnterior) {
    popupAnterior.remove();
  }

  // Criar popup
  const popup = document.createElement('div');
  popup.id = 'popup-notificacao';
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 9999;
    max-width: 350px;
    animation: slideIn 0.5s ease-out;
    font-family: Arial, sans-serif;
  `;

  popup.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <div style="font-size: 24px; margin-right: 10px;">🔔</div>
      <h3 style="margin: 0; font-size: 18px;">Novo Agendamento</h3>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
      <p style="margin: 5px 0;"><strong>👤 Cliente:</strong> ${agendamento.nome}</p>
      <p style="margin: 5px 0;"><strong>✂️ Serviço:</strong> ${agendamento.servico}</p>
      <p style="margin: 5px 0;"><strong>⏰ Horário:</strong> ${agendamento.hora}</p>
      <p style="margin: 5px 0;"><strong>📅 Data:</strong> ${formatarData(agendamento.data)}</p>
    </div>
    <button id="fechar-popup" style="
      background: white;
      color: #667eea;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      width: 100%;
      transition: transform 0.2s;
    ">OK, ENTENDI!</button>
  `;

  // Adicionar estilos de animação
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(popup);

  // Configurar timeout para remover automaticamente
  notificacaoTimeout = setTimeout(() => {
    removerPopup();
  }, 10000); // 10 segundos

  // Botão para fechar
  document.getElementById('fechar-popup').addEventListener('click', removerPopup);
}

// Remover popup
function removerPopup() {
  const popup = document.getElementById('popup-notificacao');
  if (popup) {
    popup.style.animation = 'slideOut 0.5s ease-out forwards';
    setTimeout(() => popup.remove(), 500);
  }
  if (notificacaoTimeout) {
    clearTimeout(notificacaoTimeout);
  }
}

// Atualizar lista de atendimentos
function atualizarListaAtendimentos(snapshot) {
  const lista = document.getElementById('listaAtendimentos');
  const noAtendimentos = document.getElementById('noAtendimentos');
  
  if (!lista) return;

  lista.innerHTML = '';
  
  if (snapshot.empty) {
    if (noAtendimentos) noAtendimentos.style.display = 'block';
    return;
  }

  if (noAtendimentos) noAtendimentos.style.display = 'none';

  snapshot.forEach((docSnap) => {
    const ag = docSnap.data();
    
    const card = document.createElement('div');
    card.className = 'card atendimento-card';
    card.style.cssText = `
      margin-bottom: 15px;
      padding: 15px;
      border-left: 5px solid ${ag.status === 'em atendimento' ? '#4CAF50' : '#FF9800'};
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h4 style="margin: 0; color: #333;">${ag.nome}</h4>
        <span style="
          background: ${ag.status === 'em atendimento' ? '#4CAF50' : '#FF9800'};
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        ">
          ${ag.status.toUpperCase()}
        </span>
      </div>
      <p style="margin: 10px 0;"><strong>Serviço:</strong> ${ag.servico}</p>
      <p style="margin: 10px 0;"><strong>Horário:</strong> ${ag.hora}</p>
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        ${ag.status === 'agendado' ? 
          `<button class="btn-iniciar" data-id="${docSnap.id}" style="
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            flex: 1;
          ">INICIAR ATENDIMENTO</button>` : 
          `<button class="btn-finalizar" data-id="${docSnap.id}" style="
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            flex: 1;
          ">FINALIZAR ATENDIMENTO</button>`
        }
      </div>
    `;

    // Adicionar evento ao botão
    const btn = card.querySelector(ag.status === 'agendado' ? '.btn-iniciar' : '.btn-finalizar');
    if (btn) {
      btn.addEventListener('click', async () => {
        const novoStatus = ag.status === 'agendado' ? 'em atendimento' : 'atendido';
        
        if (confirm(`Confirmar mudança para "${novoStatus}"?`)) {
          try {
            await updateDoc(doc(db, "agendamentos", docSnap.id), {
              status: novoStatus,
              atualizadoEm: new Date()
            });
            
            // Mostrar confirmação
            mostrarAlerta(`Status atualizado para ${novoStatus}!`, 'success');
          } catch (error) {
            console.error('Erro ao atualizar:', error);
            mostrarAlerta('Erro ao atualizar status', 'error');
          }
        }
      });
    }

    lista.appendChild(card);
  });
}

// Mostrar alerta
function mostrarAlerta(mensagem, tipo) {
  const alerta = document.createElement('div');
  alerta.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${tipo === 'success' ? '#4CAF50' : '#F44336'};
    color: white;
    padding: 15px 30px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: fadeIn 0.3s;
  `;
  
  alerta.textContent = mensagem;
  document.body.appendChild(alerta);
  
  setTimeout(() => {
    alerta.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => alerta.remove(), 300);
  }, 3000);
}

// Helper para formatar data
function formatarData(data) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}
