// ===== SVG Icon helpers =====
const ICONS = {
    dashboard: '<svg class="icon" viewBox="0 0 24 24"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/></svg>',
    clock: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    calendar: '<svg class="icon" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    users: '<svg class="icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    chart: '<svg class="icon" viewBox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>',
    logout: '<svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
    plus: '<svg class="icon" viewBox="0 0 24 24"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>',
    trash: '<svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    download: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    chevronLeft: '<svg class="icon" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
    userIcon: '<svg class="icon" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    eye: '<svg class="icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg class="icon" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" x2="23" y1="1" y2="23"/></svg>',
    userPlus: '<svg class="icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" x2="20" y1="8" y2="14"/><line x1="23" x2="17" y1="11" y2="11"/></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    alert: '<svg class="icon" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
    menu: '<svg class="icon" viewBox="0 0 24 24"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>',
};

// ===== Toast System =====
function showToast(title, desc, variant) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast' + (variant === 'destructive' ? ' toast-destructive' : '');
    el.innerHTML = `<div class="toast-title">${title}</div>${desc ? `<div class="toast-desc">${desc}</div>` : ''}`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ===== Auth State =====
const Auth = {
    user: null,
    isAdmin: false,
    _ready: false,
    _readyPromise: null,
    _readyResolve: null,
    init() {
        // Quick restore from cache for instant UI
        try { const d = localStorage.getItem('alms_current_user'); this.user = d ? JSON.parse(d) : null; } catch { this.user = null; }
        this.isAdmin = this.user?.role === 'hr' || this.user?.role === 'manager';

        // Listen for Firebase Auth state changes
        this._readyPromise = new Promise(resolve => { this._readyResolve = resolve; });
        firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const doc = await db.collection('employees').doc(firebaseUser.uid).get();
                    if (doc.exists) {
                        this.user = { id: firebaseUser.uid, ...doc.data() };
                        this.isAdmin = this.user.role === 'hr' || this.user.role === 'manager';
                        localStorage.setItem('alms_current_user', JSON.stringify(this.user));
                    } else {
                        this.user = null; this.isAdmin = false;
                        localStorage.removeItem('alms_current_user');
                    }
                } catch { /* keep cached user if Firestore fails momentarily */ }
            } else {
                this.user = null; this.isAdmin = false;
                localStorage.removeItem('alms_current_user');
            }
            if (!this._ready) { this._ready = true; this._readyResolve(); }
            Router.resolve();
        });
    },
    async login(email, password) {
        const emp = await API.login(email, password);
        this.user = emp;
        this.isAdmin = emp.role === 'hr' || emp.role === 'manager';
        localStorage.setItem('alms_current_user', JSON.stringify(emp));
        return emp;
    },
    async logout() {
        await firebaseAuth.signOut();
        this.user = null; this.isAdmin = false;
        localStorage.removeItem('alms_current_user');
    }
};

// ===== Router =====
const Router = {
    routes: {},
    register(path, handler) { this.routes[path] = handler; },
    navigate(path) { window.location.hash = '#' + path; },
    getHash() { return window.location.hash.slice(1) || '/login'; },
    getParams() {
        const hash = this.getHash();
        // Check for /admin/employees/:id pattern
        const match = hash.match(/^\/admin\/employees\/(.+)$/);
        if (match) return { route: '/admin/employees/:id', id: match[1] };
        return { route: hash, id: null };
    },
    async resolve() {
        const { route, id } = this.getParams();
        if (!Auth.user && route !== '/login') { this.navigate('/login'); return; }
        if (Auth.user && route === '/login') { this.navigate('/dashboard'); return; }

        // Admin-only routes
        const adminRoutes = ['/admin/employees', '/admin/employees/:id', '/admin/reports'];
        if (adminRoutes.includes(route) && !Auth.isAdmin) { this.navigate('/dashboard'); return; }

        const handler = this.routes[route];
        if (handler) {
            handler(id);
        } else {
            document.getElementById('app').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;">
          <h1 style="font-size:3rem;font-weight:800;">404</h1>
          <p style="color:var(--text-muted);margin:8px 0 24px;">Page not found</p>
          <button class="btn btn-primary" onclick="Router.navigate('/dashboard')">Go to Dashboard</button>
        </div>`;
        }
    }
};

// ===== Sidebar Renderer =====
function renderSidebar() {
    return `
    <button class="mobile-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">${ICONS.menu}</button>
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <img src="assets/logo.png" alt="Logo" onerror="this.style.display='none'" />
        <span>Sashainfinty</span>
      </div>
      <div class="sidebar-nav">
        <div class="sidebar-group-label">Menu</div>
        <button class="sidebar-item ${Router.getHash() === '/dashboard' ? 'active' : ''}" onclick="Router.navigate('/dashboard')">${ICONS.dashboard}<span>Dashboard</span></button>
        <button class="sidebar-item ${Router.getHash() === '/attendance' ? 'active' : ''}" onclick="Router.navigate('/attendance')">${ICONS.clock}<span>Attendance</span></button>
        <button class="sidebar-item ${Router.getHash() === '/leave' ? 'active' : ''}" onclick="Router.navigate('/leave')">${ICONS.calendar}<span>Leave</span><span id="leave-badge-sidebar"></span></button>
        ${Auth.isAdmin ? `
          <div class="sidebar-group-label" style="margin-top:12px;">Admin</div>
          <button class="sidebar-item ${Router.getHash() === '/admin/employees' || Router.getHash().startsWith('/admin/employees/') ? 'active' : ''}" onclick="Router.navigate('/admin/employees')">${ICONS.users}<span>Employees</span></button>
          <button class="sidebar-item ${Router.getHash() === '/admin/reports' ? 'active' : ''}" onclick="Router.navigate('/admin/reports')">${ICONS.chart}<span>Reports</span></button>
        ` : ''}
      </div>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-name">${Auth.user?.name || ''}</div>
          <div class="user-role">${Auth.user?.role || ''} · ${Auth.user?.department || ''}</div>
        </div>
        <button class="logout-btn" onclick="Auth.logout().then(() => Router.navigate('/login'))">${ICONS.logout} Logout</button>
      </div>
    </nav>`;
}

function renderDashboardLayout(content) {
    return `${renderSidebar()}<main class="main-content"><div class="space-y">${content}</div></main>`;
}

// Update pending badge
async function updateLeaveBadge() {
    if (!Auth.isAdmin) return;
    try {
        const leaves = await API.getLeaves();
        const pending = leaves.filter(l => l.status === 'pending' && l.employee_id !== Auth.user.id).length;
        const el = document.getElementById('leave-badge-sidebar');
        if (el) el.innerHTML = pending > 0 ? `<span class="badge-count">${pending}</span>` : '';
    } catch { }
}

// ===== Register Routes =====
Router.register('/login', () => renderLoginPage());
Router.register('/dashboard', () => renderDashboardPage());
Router.register('/attendance', () => renderAttendancePage());
Router.register('/leave', () => renderLeavePage());
Router.register('/admin/employees', () => renderAdminEmployeesPage());
Router.register('/admin/employees/:id', (id) => renderEmployeeProfilePage(id));
Router.register('/admin/reports', () => renderAdminReportsPage());

// ===== Boot =====
Auth.init();
window.addEventListener('hashchange', () => Router.resolve());
// Always resolve immediately — shows login page if no cached user,
// or cached dashboard. Firebase onAuthStateChanged will re-resolve when ready.
Router.resolve();
