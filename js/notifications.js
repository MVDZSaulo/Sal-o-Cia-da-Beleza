import { messaging, db, auth } from "./firebase.js";
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { doc, setDoc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

class NotificationSystem {
  constructor() {
    this.currentToken = null;
    this.notificationSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-classic-alarm-995.mp3');
    this.notificationSound.volume = 0.3;
    this.init();
  }

  async init() {
    // Verificar se é suportado
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações');
      return;
    }

    // Aguardar autenticação
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await this.requestPermission(user.uid);
        this.setupMessageListener();
      }
    });
  }

  async requestPermission(userId) {
    try {
        // Verificar se a permissão foi bloqueada pelo usuário
        if (Notification.permission === 'denied') {
            console.log('Permissão para notificações foi bloqueada pelo usuário');
            
            // Mostrar instruções para desbloquear
            this.showPermissionBlockedAlert();
            return null;
        }
        
        // Se for a primeira vez ou permission for 'default', pedir permissão
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('Permissão para notificações concedida');
                
                // Obter token FCM
                this.currentToken = await getToken(messaging, {
                    vapidKey: 'SUA_VAPID_KEY_AQUI' // Adicione sua chave VAPID
                });

                if (this.currentToken) {
                    // Salvar token no Firestore
                    await this.saveToken(userId, this.currentToken);
                    console.log('Token salvo:', this.currentToken);
                    return this.currentToken;
                }
            } else {
                console.log('Permissão para notificações negada');
                return null;
            }
        } else if (Notification.permission === 'granted') {
            // Permissão já concedida, apenas obter token
            this.currentToken = await getToken(messaging, {
                vapidKey: 'SUA_VAPID_KEY_AQUI'
            });
            
            if (this.currentToken) {
                await this.saveToken(userId, this.currentToken);
                return this.currentToken;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao solicitar permissão:', error);
        return null;
    }
}

showPermissionBlockedAlert() {
    // Criar alerta informativo
    const alertDiv = document.createElement('div');
    alertDiv.id = 'notification-permission-alert';
    alertDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 400px;
        animation: slideUp 0.3s ease-out;
        text-align: center;
    `;
    
    alertDiv.innerHTML = `
        <div style="margin-bottom: 10px;">
            <strong>🔔 Notificações Bloqueadas</strong>
        </div>
        <div style="font-size: 0.9rem; margin-bottom: 15px;">
            Para receber notificações, você precisa permitir no navegador.
            <br>
            <small>Clique no ícone 🔒 ao lado da URL e altere para "Permitir"</small>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="closePermissionAlert" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid white;
                color: white;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
            ">Fechar</button>
            <button id="openHelpPermission" style="
                background: white;
                color: #ff6b6b;
                border: none;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
            ">Como Permitir?</button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Adicionar estilos de animação
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                transform: translate(-50%, 100%);
                opacity: 0;
            }
            to {
                transform: translate(-50%, 0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Configurar eventos
    document.getElementById('closePermissionAlert').addEventListener('click', () => {
        alertDiv.style.animation = 'slideUp 0.3s ease-out reverse forwards';
        setTimeout(() => alertDiv.remove(), 300);
    });
    
    document.getElementById('openHelpPermission').addEventListener('click', () => {
        this.showPermissionInstructions();
    });
    
    // Fechar automaticamente após 15 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.animation = 'slideUp 0.3s ease-out reverse forwards';
            setTimeout(() => alertDiv.remove(), 300);
        }
    }, 15000);
}

showPermissionInstructions() {
    const modal = document.createElement('div');
    modal.id = 'permission-help-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        z-index: 10001;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #333;">📱 Como permitir notificações</h3>
                <button id="closeHelpModal" style="
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #666;
                ">&times;</button>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4 style="color: #ff6b6b; margin-bottom: 10px;">Google Chrome:</h4>
                <ol style="margin-left: 20px; color: #555;">
                    <li>Clique no ícone <strong>🔒</strong> (cadeado) na barra de endereços</li>
                    <li>Encontre "Notificações" na lista</li>
                    <li>Altere de "Bloquear" para <strong>"Permitir"</strong></li>
                    <li>Recarregue a página</li>
                </ol>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4 style="color: #ff6b6b; margin-bottom: 10px;">Mozilla Firefox:</h4>
                <ol style="margin-left: 20px; color: #555;">
                    <li>Clique no ícone <strong>ⓘ</strong> (informação) na barra de endereços</li>
                    <li>Clique no ícone de engrenagem <strong>⚙️</strong> ao lado de "Notificações"</li>
                    <li>Selecione <strong>"Permitir notificações"</strong></li>
                    <li>Recarregue a página</li>
                </ol>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4 style="color: #ff6b6b; margin-bottom: 10px;">Microsoft Edge:</h4>
                <ol style="margin-left: 20px; color: #555;">
                    <li>Clique no ícone <strong>🔒</strong> (cadeado) na barra de endereços</li>
                    <li>Clique em "Permissões do site"</li>
                    <li>Encontre "Notificações"</li>
                    <li>Altere para <strong>"Permitir"</strong></li>
                    <li>Recarregue a página</li>
                </ol>
            </div>
            
            <div style="
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #ff6b6b;
            ">
                <p style="margin: 0; color: #666; font-size: 0.9rem;">
                    <strong>💡 Dica:</strong> Após alterar a permissão, recarregue a página para que as alterações tenham efeito.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 25px;">
                <button id="reloadPageBtn" style="
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 1rem;
                ">Recarregar Página</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Configurar eventos
    document.getElementById('closeHelpModal').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('reloadPageBtn').addEventListener('click', () => {
        location.reload();
    });
    
    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

  async saveToken(userId, token) {
    try {
      await setDoc(doc(db, "userTokens", userId), {
        token: token,
        userId: userId,
        email: auth.currentUser?.email,
        createdAt: new Date(),
        updatedAt: new Date(),
        enabled: true
      }, { merge: true });
    } catch (error) {
      console.error('Erro ao salvar token:', error);
    }
  }

  setupMessageListener() {
    // Ouvir mensagens em primeiro plano
    onMessage(messaging, (payload) => {
      console.log('Mensagem recebida em primeiro plano:', payload);
      this.showNotification(payload);
    });
  }

  async showNotification(payload) {
    // Tocar som de notificação
    this.playNotificationSound();

    // Criar notificação personalizada
    this.createCustomNotification(payload);

    // Se o usuário permitiu notificações do navegador
    if (Notification.permission === 'granted') {
      const notificationTitle = payload.notification?.title || 'Salão Beleza & Cia';
      const notificationOptions = {
        body: payload.notification?.body || 'Nova mensagem',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: payload.data || {},
        tag: 'salao-notification',
        requireInteraction: true
      };

      const notification = new Notification(notificationTitle, notificationOptions);

      // Lidar com clique na notificação
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Navegar para página específica se houver URL nos dados
        if (payload.data?.url) {
          window.location.href = payload.data.url;
        }
      };
    }
  }

  createCustomNotification(payload) {
    // Remover notificação anterior se existir
    const existingPopup = document.getElementById('notification-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Criar elemento de notificação personalizada
    const popup = document.createElement('div');
    popup.id = 'notification-popup';
    popup.className = 'notification-popup';
    
    const title = payload.notification?.title || 'Nova Notificação';
    const body = payload.notification?.body || '';
    const type = payload.data?.type || 'info';
    
    popup.innerHTML = `
      <div class="notification-header ${type}">
        <span class="notification-icon">
          ${this.getNotificationIcon(type)}
        </span>
        <h4>${title}</h4>
        <button class="close-notification">&times;</button>
      </div>
      <div class="notification-body">
        <p>${body}</p>
        ${payload.data?.details ? `<p class="notification-details">${payload.data.details}</p>` : ''}
        ${payload.data?.url ? `<a href="${payload.data.url}" class="notification-link">Ver detalhes →</a>` : ''}
      </div>
    `;

    document.body.appendChild(popup);

    // Animação de entrada
    setTimeout(() => {
      popup.classList.add('show');
    }, 10);

    // Fechar ao clicar no X
    popup.querySelector('.close-notification').addEventListener('click', () => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 300);
    });

    // Fechar automaticamente após 10 segundos
    setTimeout(() => {
      if (popup.parentNode) {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 300);
      }
    }, 10000);
  }

  getNotificationIcon(type) {
    const icons = {
      'agendamento': '📅',
      'lembrete': '⏰',
      'alteracao': '🔄',
      'cancelamento': '❌',
      'confirmacao': '✅',
      'info': 'ℹ️',
      'alerta': '⚠️'
    };
    return icons[type] || '🔔';
  }

  playNotificationSound() {
    this.notificationSound.currentTime = 0;
    this.notificationSound.play().catch(e => console.log('Erro ao tocar som:', e));
  }

  // Enviar notificação para um usuário específico
  async sendNotificationToUser(userId, title, body, data = {}) {
    try {
      // Buscar token do usuário
      const tokenDoc = await getDoc(doc(db, "userTokens", userId));
      
      if (!tokenDoc.exists()) {
        console.log('Usuário não tem token registrado');
        return false;
      }

      const userToken = tokenDoc.data().token;
      
      // Enviar notificação via Firebase Cloud Functions ou backend
      await this.sendPushNotification(userToken, title, body, data);
      
      // Registrar no histórico
      await this.saveNotificationHistory(userId, title, body, data);
      
      return true;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }
  }

  async sendPushNotification(token, title, body, data = {}) {
    // Aqui você precisaria de um backend para enviar notificações
    // Esta é uma implementação simplificada que usa fetch para um endpoint
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          title,
          body,
          data
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Erro ao enviar push:', error);
      return false;
    }
  }

  async saveNotificationHistory(userId, title, body, data) {
    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        title,
        body,
        data,
        read: false,
        createdAt: new Date(),
        type: data.type || 'info'
      });
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  }

  // Enviar notificação para todos os usuários com um determinado papel
  async sendNotificationToRole(role, title, body, data = {}) {
    try {
      // Buscar todos os usuários com o papel especificado
      const usersQuery = query(
        collection(db, "users"),
        where("role", "==", role),
        where("ativo", "==", true)
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      const results = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const result = await this.sendNotificationToUser(userId, title, body, data);
        results.push({ userId, success: result });
      }
      
      return results;
    } catch (error) {
      console.error('Erro ao enviar notificação para papel:', error);
      return [];
    }
  }

  // Enviar lembrete de agendamento
  async sendAppointmentReminder(appointmentId, appointmentData) {
    const { userId, cliente, servico, data, hora } = appointmentData;
    
    const title = '⏰ Lembrete de Agendamento';
    const body = `Olá! Você tem um agendamento para ${cliente} (${servico}) às ${hora}`;
    
    const notificationData = {
      type: 'lembrete',
      appointmentId: appointmentId,
      url: `/agendamento.html?view=${appointmentId}`,
      details: `Data: ${data} às ${hora}`
    };
    
    return await this.sendNotificationToUser(userId, title, body, notificationData);
  }

  // Enviar notificação de novo agendamento para profissional
  async sendNewAppointmentToProfessional(professionalId, appointmentData) {
    const { cliente, servico, data, hora } = appointmentData;
    
    const title = '📅 Novo Agendamento';
    const body = `${cliente} agendou ${servico} para ${data} às ${hora}`;
    
    const notificationData = {
      type: 'agendamento',
      appointmentId: appointmentData.id,
      url: `/profissional.html?appointment=${appointmentData.id}`,
      details: `Cliente: ${cliente} | Serviço: ${servico}`
    };
    
    return await this.sendNotificationToUser(professionalId, title, body, notificationData);
  }
}

// Exportar instância única
export const notificationSystem = new NotificationSystem();

// Inicializar notificações quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  notificationSystem.init();
});