// dashboard-notifications.js
import { db, auth } from "./firebase.js";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  updateDoc,
  doc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

class DashboardNotifications {
  constructor() {
    this.unsubscribe = null;
    this.init();
  }

  async init() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.loadNotifications(user.uid);
        this.setupNotificationBell();
      }
    });
  }

  async loadNotifications(userId) {
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    if (this.unsubscribe) this.unsubscribe();

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.updateNotificationsList(snapshot);
      this.updateNotificationCount(snapshot);
    });
  }

  updateNotificationsList(snapshot) {
    const listElement = document.getElementById('notificationsList');
    if (!listElement) return;

    listElement.innerHTML = '';

    if (snapshot.empty) {
      listElement.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-8 text-gray-500">
            Nenhuma notificação no momento
          </td>
        </tr>
      `;
      return;
    }

    snapshot.forEach((docSnap) => {
      const notification = docSnap.data();
      const notificationId = docSnap.id;
      
      const row = document.createElement('tr');
      row.className = notification.read ? '' : 'notification-row unread';
      row.onclick = () => this.markAsRead(notificationId);
      
      const date = notification.createdAt?.toDate() || new Date();
      const formattedDate = date.toLocaleDateString('pt-BR');
      const formattedTime = date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      row.innerHTML = `
        <td>
          <div>
            <strong>${notification.title}</strong>
            <p class="text-sm text-gray-600 mb-0">${notification.body}</p>
          </div>
        </td>
        <td>
          <span class="notification-type type-${notification.type || 'info'}">
            ${notification.type || 'info'}
          </span>
        </td>
        <td>
          <div class="text-sm">
            <div>${formattedDate}</div>
            <div class="text-gray-500">${formattedTime}</div>
          </div>
        </td>
        <td>
          ${notification.read ? 
            '<span class="text-success">✓ Lida</span>' : 
            '<span class="text-primary"><strong>NOVA</strong></span>'
          }
        </td>
      `;
      
      listElement.appendChild(row);
    });
  }

  updateNotificationCount(snapshot) {
    const countElement = document.getElementById('notificationCount');
    if (!countElement) return;

    let unreadCount = 0;
    snapshot.forEach((docSnap) => {
      const notification = docSnap.data();
      if (!notification.read) unreadCount++;
    });

    if (unreadCount > 0) {
      countElement.textContent = unreadCount > 9 ? '9+' : unreadCount.toString();
      countElement.style.display = 'flex';
    } else {
      countElement.style.display = 'none';
    }
  }

  setupNotificationBell() {
    const bellElement = document.getElementById('notificationBell');
    const modal = document.getElementById('notificationModal');
    const closeButton = document.getElementById('closeNotificationModal');
    const markAllButton = document.getElementById('btnMarkAllRead');

    if (bellElement && modal) {
      bellElement.addEventListener('click', () => {
        this.showNotificationModal();
        modal.classList.add('show');
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', () => {
        modal.classList.remove('show');
      });
    }

    if (markAllButton) {
      markAllButton.addEventListener('click', () => {
        this.markAllAsRead();
      });
    }

    // Fechar modal ao clicar fora
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    }
  }

  async showNotificationModal() {
    const user = auth.currentUser;
    if (!user) return;

    const modalContent = document.getElementById('notificationModalContent');
    if (!modalContent) return;

    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const snapshot = await getDocs(q);
    
    modalContent.innerHTML = '';

    if (snapshot.empty) {
      modalContent.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <div class="empty-state-icon">🔔</div>
          <div class="empty-state-title">Nenhuma notificação</div>
        </div>
      `;
      return;
    }

    snapshot.forEach((docSnap) => {
      const notification = docSnap.data();
      const notificationId = docSnap.id;
      
      const item = document.createElement('div');
      item.className = `notification-item ${notification.read ? '' : 'unread'}`;
      item.onclick = () => {
        this.markAsRead(notificationId);
        if (notification.data?.url) {
          window.location.href = notification.data.url;
        }
      };
      
      const date = notification.createdAt?.toDate() || new Date();
      const formattedDate = date.toLocaleDateString('pt-BR');
      const formattedTime = date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      item.innerHTML = `
        <div class="notification-item-header">
          <div class="notification-item-title">${notification.title}</div>
          <div class="notification-item-time">${formattedTime}</div>
        </div>
        <div class="notification-item-body">${notification.body}</div>
        <div class="d-flex justify-between align-center mt-2">
          <span class="notification-item-type type-${notification.type || 'info'}">
            ${notification.type || 'info'}
          </span>
          <span class="text-xs text-gray-500">${formattedDate}</span>
        </div>
      `;
      
      modalContent.appendChild(item);
    });
  }

  async markAsRead(notificationId) {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
        readAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  }

  async markAllAsRead() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const notificationsRef = collection(db, "notifications");
      const q = query(
        notificationsRef,
        where("userId", "==", user.uid),
        where("read", "==", false)
      );

      const snapshot = await getDocs(q);
      const promises = [];

      snapshot.forEach((docSnap) => {
        promises.push(
          updateDoc(doc(db, "notifications", docSnap.id), {
            read: true,
            readAt: new Date()
          })
        );
      });

      await Promise.all(promises);
      
      // Mostrar confirmação
      this.showToast('✅ Todas as notificações foram marcadas como lidas', 'success');
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      this.showToast('❌ Erro ao marcar notificações', 'error');
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span>
      <span>${message}</span>
    `;
    
    const container = document.getElementById('toastContainer') || document.body;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// Inicializar quando a página carregar
let dashboardNotifications = null;

document.addEventListener('DOMContentLoaded', () => {
  dashboardNotifications = new DashboardNotifications();
});

// Limpar quando sair da página
window.addEventListener('beforeunload', () => {
  if (dashboardNotifications) {
    dashboardNotifications.cleanup();
  }
});

export { DashboardNotifications };