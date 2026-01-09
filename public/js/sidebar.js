import { auth, signOut } from './firebase.js';

export function initSidebar(activePage = 'dashboard') {
    const sidebarHTML = `
    <div id="mobileMenuBtn" class="mobile-menu-btn">
        <span>☰</span>
    </div>
    <div id="sidebarOverlay" class="sidebar-overlay"></div>
    <aside class="sidebar" id="mainSidebar">
        <div class="sidebar-header">
            <div class="sidebar-brand">
                <span class="icon">✨</span>
                <h2>Beleza & Cia</h2>
            </div>
            <button id="closeSidebarBtn" class="close-sidebar-btn">×</button>
        </div>
        
        <nav class="sidebar-nav">
            <a href="dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
                <span class="icon">📊</span>
                Dashboard
            </a>
            <a href="agendamento.html" class="nav-item ${activePage === 'agendamento' ? 'active' : ''}">
                <span class="icon">📅</span>
                Agendamentos
            </a>
            <a href="clientes.html" class="nav-item ${activePage === 'clientes' ? 'active' : ''}">
                <span class="icon">👥</span>
                Clientes
            </a>
            <a href="profissionais.html" class="nav-item ${activePage === 'profissionais' ? 'active' : ''}">
                <span class="icon">✂️</span>
                Profissionais
            </a>
            <a href="servicos.html" class="nav-item ${activePage === 'servicos' ? 'active' : ''}">
                <span class="icon">💆‍♀️</span>
                Serviços
            </a>
        </nav>

        <div class="sidebar-footer">
            <button id="logoutBtn" class="nav-item logout">
                <span class="icon">🚪</span>
                Sair
            </button>
        </div>
    </aside>
    `;

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --sidebar-width: 260px;
        }

        .sidebar {
            width: var(--sidebar-width);
            height: 100vh;
            background: white;
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            position: fixed;
            left: 0;
            top: 0;
            z-index: 1000;
            transition: transform 0.3s ease;
        }

        .sidebar-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--primary-color);
        }

        .sidebar-brand .icon { font-size: 1.5rem; }

        .close-sidebar-btn {
            display: none;
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: var(--text-secondary);
        }

        .sidebar-nav {
            padding: 1rem;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            overflow-y: auto;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            font-weight: 500;
            text-decoration: none;
            transition: all var(--transition-fast);
            border: none;
            background: none;
            width: 100%;
            cursor: pointer;
            text-align: left;
            font-family: inherit;
            font-size: 1rem;
        }

        .nav-item:hover {
            background-color: var(--bg-body);
            color: var(--primary-color);
        }

        .nav-item.active {
            background-color: var(--primary-light);
            color: var(--primary-color);
        }

        .sidebar-footer {
            padding: 1rem;
            border-top: 1px solid var(--border-color);
        }

        .nav-item.logout { color: var(--danger-color); }
        .nav-item.logout:hover { background-color: #fef2f2; }
        
        /* Mobile Menu Button */
        .mobile-menu-btn {
            position: fixed;
            top: 1rem;
            left: 1rem;
            z-index: 900;
            background: white;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 8px 12px;
            cursor: pointer;
            display: none;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.5);
            z-index: 950;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s;
        }

        .sidebar-overlay.show {
            opacity: 1;
            visibility: visible;
        }
        
        main {
            margin-left: var(--sidebar-width);
            padding: 2rem;
            min-height: 100vh;
            transition: margin-left 0.3s ease;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
            }
            .sidebar.open {
                transform: translateX(0);
            }
            main {
                margin-left: 0;
                padding: 1rem; /* Less padding on mobile */
                padding-top: 4rem; /* Space for mobile menu button */
            }
            .mobile-menu-btn {
                display: block;
            }
            .close-sidebar-btn {
                display: block;
            }
        }
    `;
    document.head.appendChild(style);

    // Insert sidebar at the start of body
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    // Logic
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuBtn = document.getElementById('mobileMenuBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }

    menuBtn.addEventListener('click', toggleSidebar);
    closeBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // Handle Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    });
}
