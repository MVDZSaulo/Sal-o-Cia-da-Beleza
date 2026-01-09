import { auth, onAuthStateChanged, db, collection, query, where, getDocs, orderBy, limit, onSnapshot } from './firebase.js';
import { initSidebar } from './sidebar.js';
import './auth-guard.js';

// Initialize Sidebar
initSidebar('dashboard');

// Update User Name
onAuthStateChanged(auth, (user) => {
  if (user && user.displayName) {
    document.getElementById('userName').textContent = user.displayName;
  }
});

// Load Dashboard Data
// Real-time Dashboard Data
function initDashboardListeners() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Appointments Listener
  const q = query(
    collection(db, "agendamentos"),
    where("data", ">=", today),
    orderBy("data"),
    limit(5)
  );

  onSnapshot(q, (querySnapshot) => {
    const tbody = document.getElementById('appointmentsTable');

    if (querySnapshot.empty) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                        Nenhum agendamento para hoje.
                    </td>
                </tr>
            `;
      document.getElementById('todayAppointments').textContent = 0;
      return;
    }

    tbody.innerHTML = '';
    let count = 0;
    let revenue = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      count++;

      // Calculate revenue if price is available
      if (data.valor) {
        revenue += parseFloat(data.valor);
      }

      // Safe Date Parsing
      let date;
      if (data.data?.toDate) {
        date = data.data.toDate();
      } else if (data.data instanceof Date) {
        date = data.data;
      } else {
        date = new Date(data.data);
      }

      const timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const row = `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 1rem;">
                        <div style="font-weight: 500;">${data.clienteNome || 'Cliente'}</div>
                    </td>
                    <td style="padding: 1rem;">${data.servicoNome || 'Serviço'}</td>
                    <td style="padding: 1rem;">${data.profissionalNome || 'Profissional'}</td>
                    <td style="padding: 1rem;">${timeString}</td>
                     <td style="padding: 1rem;">
                        <span style="
                            padding: 0.25rem 0.75rem; 
                            border-radius: 999px; 
                            font-size: 0.75rem; 
                            font-weight: 500; 
                            background-color: #dcfce7; 
                            color: #166534;
                        ">
                            Confirmado
                        </span>
                    </td>
                </tr>
            `;
      tbody.insertAdjacentHTML('beforeend', row);
    });

    // Update Counters
    document.getElementById('todayAppointments').textContent = count;
    document.getElementById('dailyRevenue').textContent = revenue.toFixed(2);
  }, (error) => {
    console.error("Error listening to dashboard appointments:", error);
  });



  // 3. New Clients (This Month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const clientsQ = query(
    collection(db, "clientes"),
    where("criadoEm", ">=", startOfMonth)
  );

  onSnapshot(clientsQ, (snapshot) => {
    document.getElementById('newClients').textContent = snapshot.size;
  });
}

// Initialize listeners
initDashboardListeners();