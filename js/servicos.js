import { db, collection, addDoc, getDocs, orderBy, query, Timestamp, doc, updateDoc, deleteDoc } from './firebase.js';
import { initSidebar } from './sidebar.js';
import './auth-guard.js';

initSidebar('servicos');

const modal = document.getElementById('modalServico');
const btnNovo = document.getElementById('btnNovoServico');
const btnFechar = document.getElementById('btnFecharModal');
const form = document.getElementById('formServico');
const tableBody = document.getElementById('servicosTable');

// State
let isEditing = false;
let currentEditId = null;

async function loadServicos() {
    try {
        const q = query(collection(db, "servicos"), orderBy("nome"));
        const snapshot = await getDocs(q);

        tableBody.innerHTML = '';
        if (snapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 2rem;">Nenhum serviço cadastrado.</td></tr>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            const row = `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 1rem; font-weight: 500;">${data.nome}</td>
                    <td style="padding: 1rem;">${data.duracao} min</td>
                    <td style="padding: 1rem;">R$ ${parseFloat(data.preco).toFixed(2)}</td>
                    <td style="padding: 1rem;">
                        <button class="btn btn-secondary btn-edit" 
                            data-id="${id}"
                            data-nome="${data.nome}"
                            data-duracao="${data.duracao}"
                            data-preco="${data.preco}"
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
                deleteServico(e.currentTarget.dataset.id, e.currentTarget.dataset.nome);
            });
        });

    } catch (e) {
        console.error(e);
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 2rem;">Erro ao carregar.</td></tr>`;
    }
}

function openEditModal(data) {
    isEditing = true;
    currentEditId = data.id;

    document.getElementById('nomeServico').value = data.nome;
    document.getElementById('duracaoServico').value = data.duracao;
    document.getElementById('precoServico').value = data.preco;

    modal.querySelector('h2').textContent = 'Editar Serviço';
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

    modal.querySelector('h2').textContent = 'Novo Serviço';
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Salvar Serviço';
    submitBtn.classList.remove('btn-success');
    submitBtn.classList.add('btn-primary');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

btnFechar.onclick = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };

form.onsubmit = async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nomeServico').value;
    const duracao = document.getElementById('duracaoServico').value;
    const preco = document.getElementById('precoServico').value;

    const payload = { nome, duracao, preco };

    try {
        if (isEditing && currentEditId) {
            await updateDoc(doc(db, "servicos", currentEditId), {
                ...payload,
                atualizadoEm: Timestamp.now()
            });
            alert('Serviço atualizado!');
        } else {
            await addDoc(collection(db, "servicos"), {
                ...payload,
                criadoEm: Timestamp.now()
            });
            alert('Serviço salvo!');
        }

        modal.classList.add('hidden');
        modal.classList.remove('flex');
        form.reset();
        loadServicos();
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar.');
    }
};


async function deleteServico(id, nome) {
    if (confirm(`Tem certeza que deseja excluir o serviço ${nome}?`)) {
        try {
            await deleteDoc(doc(db, "servicos", id));
            alert('Serviço excluído com sucesso.');
            loadServicos();
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir: ' + e.message);
        }
    }
}

loadServicos();
