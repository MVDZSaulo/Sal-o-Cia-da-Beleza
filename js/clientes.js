import { db, collection, addDoc, getDocs, orderBy, query, Timestamp, doc, updateDoc, deleteDoc } from './firebase.js';
import { initSidebar } from './sidebar.js';
import './auth-guard.js';

initSidebar('clientes');

const modal = document.getElementById('modalCliente');
const btnNovo = document.getElementById('btnNovoCliente');
const btnFechar = document.getElementById('btnFecharModal');
const form = document.getElementById('formCliente');
const tableBody = document.getElementById('clientesTable');

// State
let isEditing = false;
let currentEditId = null;

async function loadClientes() {
  try {
    const q = query(collection(db, "clientes"), orderBy("nome"));
    const snapshot = await getDocs(q);

    tableBody.innerHTML = '';
    if (snapshot.empty) {
      tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 2rem;">Nenhum cliente cadastrado.</td></tr>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;

      const row = `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 1rem; font-weight: 500;">${data.nome}</td>
                    <td style="padding: 1rem;">${data.email || '-'}</td>
                    <td style="padding: 1rem;">${data.telefone}</td>
                    <td style="padding: 1rem;">
                        <button class="btn btn-secondary btn-edit"
                            data-id="${id}"
                            data-nome="${data.nome}"
                            data-email="${data.email || ''}"
                            data-telefone="${data.telefone}"
                            style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                            Editar
                        </button>
                        <button class="btn btn-danger btn-delete" 
                            data-id="${id}" 
                            data-nome="${data.nome}"
                            style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.5rem; background-color: var(--danger-color, #ef4444); color: white; border: none; border-radius: var(--radius-sm);">
                            Excluir
                        </button>
                    </td>
                </tr>
            `;
      tableBody.insertAdjacentHTML('beforeend', row);
    });

    // Attach Listeners
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        openEditModal(e.currentTarget.dataset);
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        deleteCliente(e.currentTarget.dataset.id, e.currentTarget.dataset.nome);
      });
    });

  } catch (e) {
    console.log("Error loading clients (maybe collection empty):", e);
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 2rem;">Nenhum cliente encontrado.</td></tr>`;
  }
}

function openEditModal(data) {
  isEditing = true;
  currentEditId = data.id;

  document.getElementById('nomeCliente').value = data.nome;
  document.getElementById('emailCliente').value = data.email;
  document.getElementById('telefoneCliente').value = data.telefone;

  modal.querySelector('h2').textContent = 'Editar Cliente';
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Salvar Alterações';
  submitBtn.classList.remove('btn-primary');
  submitBtn.classList.add('btn-success');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

btnNovo.onclick = () => {
  isEditing = false;
  currentEditId = null;
  form.reset();

  modal.querySelector('h2').textContent = 'Novo Cliente';
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Salvar Cliente';
  submitBtn.classList.remove('btn-success');
  submitBtn.classList.add('btn-primary');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

btnFechar.onclick = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };

form.onsubmit = async (e) => {
  e.preventDefault();
  const nome = document.getElementById('nomeCliente').value;
  const email = document.getElementById('emailCliente').value;
  const telefone = document.getElementById('telefoneCliente').value;

  const payload = { nome, email, telefone };

  try {
    if (isEditing && currentEditId) {
      await updateDoc(doc(db, "clientes", currentEditId), {
        ...payload,
        atualizadoEm: Timestamp.now()
      });
      alert('Cliente atualizado!');
    } else {
      await addDoc(collection(db, "clientes"), {
        ...payload,
        criadoEm: Timestamp.now()
      });
      alert('Cliente salvo!');
    }

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    form.reset();
    loadClientes();
  } catch (e) {
    console.error(e);
    alert('Erro ao salvar.');
  }
};


async function deleteCliente(id, nome) {
  if (confirm(`Tem certeza que deseja excluir o cliente ${nome}?`)) {
    try {
      await deleteDoc(doc(db, "clientes", id));
      alert('Cliente excluído com sucesso.');
      loadClientes();
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir: ' + e.message);
    }
  }
}

loadClientes();