import { db, collection, addDoc, getDocs, orderBy, query, createUserWithProfile, createProfessional, doc, updateDoc, deleteDoc, Timestamp } from './firebase.js';
import { initSidebar } from './sidebar.js';
import './auth-guard.js';

initSidebar('profissionais');

const modal = document.getElementById('modalProfissional');
const btnNovo = document.getElementById('btnNovoProfissional');
const btnFechar = document.getElementById('btnFecharModal');
const form = document.getElementById('formProfissional');
const tableBody = document.getElementById('profissionaisTable');

// State
let isEditing = false;
let currentEditId = null;

async function loadProfissionais() {
    try {
        const q = query(collection(db, "users"), orderBy("nome"));
        const snapshot = await getDocs(q);

        tableBody.innerHTML = '';
        let found = false;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            if (data.role === 'admin') return;
            found = true;

            const row = `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 1rem; font-weight: 500;">${data.nome}</td>
                    <td style="padding: 1rem;">${data.email}</td>
                    <td style="padding: 1rem;">${data.especialidade || 'Geral'}</td>
                    <td style="padding: 1rem;">
                        <button class="btn btn-secondary btn-edit" 
                            data-id="${id}"
                            data-nome="${data.nome}"
                            data-email="${data.email}"
                            data-especialidade="${data.especialidade || ''}"
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
                deleteProfessional(e.currentTarget.dataset.id, e.currentTarget.dataset.nome);
            });
        });

        if (!found) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 2rem;">Nenhum profissional encontrado.</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 2rem;">Erro ao carregar.</td></tr>`;
    }
}

function openEditModal(data) {
    isEditing = true;
    currentEditId = data.id;

    document.getElementById('nomeProfissional').value = data.nome;
    document.getElementById('emailProfissional').value = data.email;
    document.getElementById('especialidadeProfissional').value = data.especialidade;

    // Hide password field for edit (or make optional) - for simplicity we just disable it or leave blank
    document.getElementById('senhaProfissional').disabled = true;
    document.getElementById('senhaProfissional').placeholder = "Senha não pode ser alterada aqui";
    document.getElementById('senhaProfissional').value = "";
    document.getElementById('senhaProfissional').required = false;

    modal.querySelector('h2').textContent = 'Editar Profissional';
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

    document.getElementById('senhaProfissional').disabled = false;
    document.getElementById('senhaProfissional').placeholder = "";
    document.getElementById('senhaProfissional').required = true;

    modal.querySelector('h2').textContent = 'Novo Profissional';
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Criar Acesso';
    submitBtn.classList.remove('btn-success');
    submitBtn.classList.add('btn-primary');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

btnFechar.onclick = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };

form.onsubmit = async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nomeProfissional').value;
    const email = document.getElementById('emailProfissional').value;
    const especialidade = document.getElementById('especialidadeProfissional').value;

    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';

        if (isEditing && currentEditId) {
            // Update logic (Password not updated here)
            await updateDoc(doc(db, "users", currentEditId), {
                nome,
                email,
                especialidade,
                atualizadoEm: Timestamp.now()
            });
            alert('Dados do profissional atualizados!');
        } else {
            // Create Logic using helper
            const senha = document.getElementById('senhaProfissional').value;
            await createProfessional(email, senha, nome, especialidade);
            alert('Profissional criado com sucesso! Login liberado.');
        }

        modal.classList.add('hidden');
        modal.classList.remove('flex');
        form.reset();
        loadProfissionais();
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar: ' + e.message);
    } finally {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = isEditing ? 'Salvar Alterações' : 'Criar Acesso';
    }
};

async function deleteProfessional(id, nome) {
    if (confirm(`Tem certeza que deseja excluir o profissional ${nome}? Isso removerá o acesso dele ao sistema.`)) {
        try {
            await deleteDoc(doc(db, "users", id));
            alert('Profissional excluído com sucesso.');
            loadProfissionais();
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir: ' + e.message);
        }
    }
}

loadProfissionais();
