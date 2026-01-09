import { auth, signOut, onAuthStateChanged, db, collection, query, where, onSnapshot, orderBy, doc, getDoc, getDocs, updateDoc, Timestamp } from './firebase.js';

// Auth Check (Manual since no sidebar/regular auth guard)
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        // Fetch full profile to get name reliably
        let name = user.displayName;
        if (!name) {
            try {
                // 1. Try UID
                let userDoc = await getDoc(doc(db, "users", user.uid));

                // 2. Try Legacy ID (Email based)
                if (!userDoc.exists() && user.email) {
                    const legacyId = user.email.replace(/[@.]/g, '_');
                    userDoc = await getDoc(doc(db, "users", legacyId));
                }

                // 3. Query by Email field
                if (!userDoc.exists() && user.email) {
                    const qUser = query(collection(db, "users"), where("email", "==", user.email));
                    const querySnap = await getDocs(qUser);
                    if (!querySnap.empty) {
                        userDoc = querySnap.docs[0];
                    }
                }

                if (userDoc && userDoc.exists()) {
                    name = userDoc.data().nome;
                }
            } catch (e) {
                console.error("Error fetching user profile:", e);
                // Fallback to email if fetch fails, so we don't block access
                name = user.email ? user.email.split('@')[0] : 'Profissional';
            }
        }

        // Final fallback if everything failed
        if (!name) {
            name = user.email || 'Anônimo';
        }

        document.getElementById('profName').textContent = name;
        // Proceed even if we just have the email
        loadMySchedule(user, name);
    }
});

document.getElementById('btnLogout').onclick = async () => {
    await signOut(auth);
    window.location.href = 'index.html';
};

async function loadMySchedule(user, name) {
    try {
        if (!name) {
            document.getElementById('mySchedule').innerHTML = `<p class="text-center" style="padding: 1rem;">Perfil incompleto. Contate o admin.</p>`;
            return;
        }

        // Query only by name to avoid Composite Index requirements
        const q = query(
            collection(db, "agendamentos"),
            where("profissionalNome", "==", name)
        );

        // Real-time listener
        onSnapshot(q, (snapshot) => {
            const container = document.getElementById('mySchedule');

            const allDocs = [];
            snapshot.forEach(doc => {
                allDocs.push({ id: doc.id, ...doc.data() });
            });

            // Client-side filtering and sorting
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const filteredAndSorted = allDocs
                .filter(data => {
                    let date;
                    if (data.data && typeof data.data.toDate === 'function') {
                        date = data.data.toDate();
                    } else if (data.data instanceof Date) {
                        date = data.data;
                    } else {
                        date = new Date(data.data);
                    }
                    return date >= today;
                })
                .sort((a, b) => {
                    const dateA = a.data && a.data.toDate ? a.data.toDate() : new Date(a.data);
                    const dateB = b.data && b.data.toDate ? b.data.toDate() : new Date(b.data);
                    return dateA - dateB;
                });


            if (filteredAndSorted.length === 0) {
                container.innerHTML = `<p class="text-center" style="padding: 1rem;">Nenhum agendamento futuro.</p>`;
                document.getElementById('todayCount').textContent = '0';
                return;
            }

            container.innerHTML = '';
            let count = 0;
            let nextClientSet = false;

            filteredAndSorted.forEach(data => {
                const id = data.id;

                // Safe Date Parsing
                let date;
                if (data.data && typeof data.data.toDate === 'function') {
                    date = data.data.toDate();
                } else if (data.data instanceof Date) {
                    date = data.data;
                } else {
                    date = new Date(data.data);
                }

                // Stats
                if (date.toDateString() === new Date().toDateString()) {
                    count++;
                }
                if (!nextClientSet && data.status !== 'atendido' && data.status !== 'cancelado') {
                    document.getElementById('nextClient').textContent = data.clienteNome;
                    nextClientSet = true;
                }

                // Status Logic
                const isCompleted = data.status === 'atendido';
                const statusLabel = data.status === 'cancelado' ? 'Cancelado' : (isCompleted ? 'Atendido' : 'Confirmado');

                let statusColor = '#4338ca'; // Indigo (Confirmado)
                let statusBg = '#e0e7ff';

                if (isCompleted) {
                    statusColor = '#166534'; // Green
                    statusBg = '#dcfce7';
                } else if (data.status === 'cancelado') {
                    statusColor = '#991b1b'; // Red
                    statusBg = '#fee2e2';
                }

                // Action Button Logic
                let actionButton = '';
                if (!isCompleted && data.status !== 'cancelado') {
                    actionButton = `
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn-cancel" 
                                data-id="${id}"
                                style="
                                    background-color: #fee2e2; 
                                    color: #991b1b; 
                                    border: 1px solid #fecaca;
                                    padding: 0.5rem 1rem; 
                                    border-radius: var(--radius-md); 
                                    font-size: 0.875rem; 
                                    cursor: pointer;
                                    transition: background-color 0.2s;
                                "
                                onmouseover="this.style.backgroundColor='#fecaca'"
                                onmouseout="this.style.backgroundColor='#fee2e2'"
                            >
                                Cancelar
                            </button>
                            <button class="btn-attend" 
                                data-id="${id}"
                                style="
                                    background-color: var(--success-color, #10b981); 
                                    color: white; 
                                    border: none; 
                                    padding: 0.5rem 1rem; 
                                    border-radius: var(--radius-md); 
                                    font-size: 0.875rem; 
                                    cursor: pointer;
                                    transition: background-color 0.2s;
                                "
                                onmouseover="this.style.backgroundColor='#059669'"
                                onmouseout="this.style.backgroundColor='#10b981'"
                            >
                                Atender
                            </button>
                        </div>
                    `;
                }

                // Card for appointment
                const card = `
                    <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600; font-size: 1.1rem;">${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem;">${date.toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div style="flex: 1; margin-left: 1.5rem;">
                            <div style="font-weight: 500;">${data.clienteNome}</div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem;">${data.servicoNome}</div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                            <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">${statusLabel}</span>
                            ${actionButton}
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', card);
            });

            // Update Count
            document.getElementById('todayCount').textContent = count;

            // Attach Event Listeners
            document.querySelectorAll('.btn-attend').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    await completeAppointment(id, user);
                });
            });

            document.querySelectorAll('.btn-cancel').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    await cancelAppointment(id, user);
                });
            });

        }, (error) => {
            console.error("Error loading schedule:", error);
            document.getElementById('mySchedule').innerHTML = `<p class="text-center text-red-500">Erro ao carregar agenda: ${error.message}</p>`;
        });

    } catch (error) {
        console.error("Error setting up listener:", error);
    }
}

async function completeAppointment(id, user) {
    if (!confirm('Confirmar atendimento deste cliente?')) return;

    try {
        const appointmentRef = doc(db, "agendamentos", id);
        await updateDoc(appointmentRef, {
            status: 'atendido',
            atualizadoEm: Timestamp.now()
        });


    } catch (e) {
        console.error("Error completing appointment:", e);
        alert('Erro ao atualizar status.');
    }
}

async function cancelAppointment(id, user) {
    if (!confirm('Tem certeza que deseja CANCELAR este atendimento?')) return;

    try {
        const appointmentRef = doc(db, "agendamentos", id);
        await updateDoc(appointmentRef, {
            status: 'cancelado',
            atualizadoEm: Timestamp.now()
        });
        // loadMySchedule(user);

    } catch (e) {
        console.error("Error canceling appointment:", e);
        alert('Erro ao cancelar.');
    }
}
