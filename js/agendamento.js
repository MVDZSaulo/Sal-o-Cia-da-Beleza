import { db, collection, addDoc, getDocs, onSnapshot, orderBy, query, Timestamp, doc, updateDoc, deleteDoc, where } from './firebase.js';
import { initSidebar } from './sidebar.js';
import './auth-guard.js';

initSidebar('agendamento');

// UI Elements
const modal = document.getElementById('modalAgendamento');
const btnNovo = document.getElementById('btnNovoAgendamento');
const btnFechar = document.getElementById('btnFecharModal');
const form = document.getElementById('formAgendamento');
const tableBody = document.getElementById('agendamentosTable');

// State
let isEditing = false;
let currentEditId = null;

// Data Loading
async function loadOptions() {
  // Determine today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('dataAgendamento').value = today;

  const servicoSelect = document.getElementById('servicoSelect');
  const profSelect = document.getElementById('profissionalSelect');

  // 1. Load Services from Firestore
  try {
    const qServicos = query(collection(db, "servicos"), orderBy("nome"));
    const snapshotServicos = await getDocs(qServicos);

    servicoSelect.innerHTML = '<option value="">Selecione um serviço</option>';

    if (snapshotServicos.empty) {
      // Fallback or empty state
    } else {
      snapshotServicos.forEach(doc => {
        const data = doc.data();
        const opt = document.createElement('option');
        opt.value = data.nome; // Using name as value for now to match legacy logic
        opt.dataset.preco = data.preco; // Store price in dataset
        opt.textContent = `${data.nome} - R$ ${parseFloat(data.preco).toFixed(2)}`;
        servicoSelect.appendChild(opt);
      });
    }
  } catch (error) {
    console.error("Error loading services:", error);
    servicoSelect.innerHTML = '<option value="">Erro ao carregar serviços</option>';
  }

  // 2. Load Professionals from Firestore
  try {
    // Fetch users where role == 'profissional'
    // Note: requires index? If so, simple query for all users and filter in JS might be safer for small scale
    // But let's try 'where' first.
    const qProfs = query(collection(db, "users"), where("role", "==", "profissional"));
    const snapshotProfs = await getDocs(qProfs);

    profSelect.innerHTML = '<option value="">Selecione um profissional</option>';

    if (snapshotProfs.empty) {
      console.warn("No professionals found.");
    } else {
      snapshotProfs.forEach(doc => {
        const data = doc.data();
        // Only active professionals
        if (data.ativo !== false) {
          const opt = document.createElement('option');
          opt.value = data.nome; // Using name as value
          opt.textContent = data.nome;
          profSelect.appendChild(opt);
        }
      });
    }
  } catch (error) {
    console.error("Error loading professionals:", error);
    profSelect.innerHTML = '<option value="">Erro ao carregar profissionais</option>';
  }
}

async function loadAgendamentos() {
  try {
    const q = query(collection(db, "agendamentos"), orderBy("data", "desc"));

    // Real-time listener
    onSnapshot(q, (snapshot) => {
      tableBody.innerHTML = '';

      if (snapshot.empty) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2rem;">Nenhum agendamento encontrado.</td></tr>`;
        return;
      }

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const id = docSnap.id;
        let date;

        // Safe Date Parsing
        if (data.data && typeof data.data.toDate === 'function') {
          date = data.data.toDate();
        } else if (data.data instanceof Date) {
          date = data.data;
        } else {
          date = new Date(data.data); // Fallback for strings/numbers
        }

        const isoDate = date.toISOString().split('T')[0];
        const isoTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dateString = date.toLocaleDateString('pt-BR');

        // Status Logic
        let statusBadge = '';
        if (data.status === 'atendido') {
          statusBadge = `<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 99px; font-size: 0.75rem;">Atendido</span>`;
        } else if (data.status === 'cancelado') {
          statusBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 99px; font-size: 0.75rem;">Cancelado</span>`;
        } else {
          statusBadge = `<span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 99px; font-size: 0.75rem;">Agendado</span>`;
        }

        // Store raw data in data attributes for easy retrieval
        const row = `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 1rem;">
                            ${dateString} ${timeString}
                        </td>
                        <td style="padding: 1rem;">${data.clienteNome}</td>
                        <td style="padding: 1rem;">${data.profissionalNome}</td>
                        <td style="padding: 1rem;">${data.servicoNome}</td>
                        <td style="padding: 1rem;">
                            ${statusBadge}
                        </td>
                        <td style="padding: 1rem; display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary btn-edit" 
                                data-id="${id}"
                                data-cliente="${data.clienteNome}"
                                data-servico="${data.servicoNome}"
                                data-profissional="${data.profissionalNome}"
                                data-date="${isoDate}"
                                data-time="${isoTime}"
                                style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                Editar
                            </button>
                            <button class="btn btn-danger btn-delete" 
                                data-id="${id}"
                                style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; border-radius: 0.25rem; cursor: pointer;">
                                Excluir
                            </button>
                        </td>
                    </tr>
                `;
        tableBody.insertAdjacentHTML('beforeend', row);
      });

      // Attach listener to all edit buttons
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          openEditModal(e.currentTarget.dataset);
        });
      });

      // Attach listener to all delete buttons
      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.dataset.id;
          if (confirm('Tem certeza que deseja excluir este agendamento?')) {
            try {
              await deleteDoc(doc(db, "agendamentos", id));
              // No need to call loadAgendamentos() manually as onSnapshot handles updates
              alert('Agendamento excluído.');
            } catch (error) {
              console.error("Error deleting:", error);
              alert('Erro ao excluir.');
            }
          }
        });
      });

    }, (error) => {
      console.error("Error loading appointments:", error);
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-red-500">Erro ao carregar dados: ${error.message}</td></tr>`;
    });

  } catch (error) {
    console.error("Error setting up listener:", error);
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-red-500">Erro ao iniciar: ${error.message}</td></tr>`;
  }
}

function openEditModal(data) {
  isEditing = true;
  currentEditId = data.id;

  document.getElementById('clienteNome').value = data.cliente;
  document.getElementById('servicoSelect').value = data.servico;
  document.getElementById('profissionalSelect').value = data.profissional;
  document.getElementById('dataAgendamento').value = data.date;
  document.getElementById('horaAgendamento').value = data.time;

  modal.querySelector('h2').textContent = 'Editar Agendamento';
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Salvar Alterações';
  submitBtn.classList.remove('btn-primary');
  submitBtn.classList.add('btn-success'); // You might need to define this class or just leave as primary

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

// Event Listeners
btnNovo.onclick = () => {
  isEditing = false;
  currentEditId = null;
  form.reset();

  // Set default date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('dataAgendamento').value = today;

  modal.querySelector('h2').textContent = 'Novo Agendamento';
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Confirmar Agendamento';
  submitBtn.classList.remove('btn-success');
  submitBtn.classList.add('btn-primary');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

btnFechar.onclick = () => {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
};

form.onsubmit = async (e) => {
  e.preventDefault();

  const clienteNome = document.getElementById('clienteNome').value;
  const servicoSelect = document.getElementById('servicoSelect');
  const servicoNome = servicoSelect.value;

  // Get price from selected option
  const selectedOption = servicoSelect.options[servicoSelect.selectedIndex];
  const valor = selectedOption.dataset.preco ? parseFloat(selectedOption.dataset.preco) : 0;

  const profissionalNome = document.getElementById('profissionalSelect').value;
  const dateVal = document.getElementById('dataAgendamento').value;
  const timeVal = document.getElementById('horaAgendamento').value;

  const fullDate = new Date(`${dateVal}T${timeVal}`);

  const payload = {
    clienteNome,
    servicoNome,
    profissionalNome,
    valor, // Save price
    data: Timestamp.fromDate(fullDate)
    // status kept as is or default
  };

  try {
    if (isEditing && currentEditId) {
      // Update
      await updateDoc(doc(db, "agendamentos", currentEditId), {
        ...payload,
        atualizadoEm: Timestamp.now()
      });
      alert('Agendamento atualizado com sucesso!');
    } else {
      // Create
      await addDoc(collection(db, "agendamentos"), {
        ...payload,
        status: 'agendado',
        criadoEm: Timestamp.now()
      });
      alert('Agendamento criado com sucesso!');
    }

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    form.reset();
    isEditing = false;
    currentEditId = null;
    // loadAgendamentos(); // Handled by onSnapshot

  } catch (error) {
    console.error("Error saving:", error);
    alert('Erro ao salvar agendamento.');
  }
};

// Init
loadOptions();
loadAgendamentos();