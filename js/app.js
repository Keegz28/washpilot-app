const App = {
    currentView: 'dashboard',
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.bindNav();
        this.bindModal();
        this.showView('dashboard');
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').then(reg => {
                reg.addEventListener('updatefound', () => {
                    const sw = reg.installing;
                    sw.addEventListener('statechange', () => {
                        if (sw.state === 'activated') {
                            Utils.toast('App updated — refresh for latest version');
                        }
                    });
                });
            }).catch(() => {});
        }
    },

    bindNav() {
        document.getElementById('bottom-nav').addEventListener('click', e => {
            const btn = e.target.closest('.nav-btn');
            if (!btn) return;
            this.showView(btn.dataset.view);
        });
    },

    bindModal() {
        document.getElementById('modal-close').addEventListener('click', Utils.hideModal);
        document.getElementById('modal-overlay').addEventListener('click', e => {
            if (e.target === e.currentTarget) Utils.hideModal();
        });
    },

    showView(view) {
        this.currentView = view;
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        document.getElementById(`view-${view}`).style.display = 'block';
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));

        const titles = {
            dashboard: 'Dashboard',
            bookings: 'Jobs',
            route: 'Route',
            income: 'Income',
            more: 'More'
        };
        document.getElementById('page-title').textContent = titles[view] || 'WashPilot';

        const headerBtn = document.getElementById('header-action');
        headerBtn.style.display = 'none';
        headerBtn.onclick = null;

        this.renderView(view);

        if (view === 'route' && typeof Route !== 'undefined' && Route.map) {
            setTimeout(() => Route.map.invalidateSize(), 350);
        }
    },

    async renderView(view) {
        switch (view) {
            case 'dashboard': await Dashboard.render(); break;
            case 'bookings': await Bookings.render(); break;
            case 'route': await Route.render(); break;
            case 'income': await Income.render(); break;
            case 'more': await this.renderMore(); break;
        }
    },

    async renderMore() {
        const view = document.getElementById('view-more');
        view.innerHTML = `
            <div style="margin-top:var(--sp-5);">
            <div class="card">
                <div class="menu-item" data-action="customers">
                    <span class="menu-icon">${icon('users')}</span>
                    <span class="menu-label">Customers</span>
                    <span class="menu-arrow">${icon('chevron-right')}</span>
                </div>
                <div class="menu-item" data-action="expenses">
                    <span class="menu-icon">${icon('trending-down')}</span>
                    <span class="menu-label">Expenses</span>
                    <span class="menu-arrow">${icon('chevron-right')}</span>
                </div>
                <div class="menu-item" data-action="equipment">
                    <span class="menu-icon">${icon('wrench')}</span>
                    <span class="menu-label">Equipment & Stock</span>
                    <span class="menu-arrow">${icon('chevron-right')}</span>
                </div>
                <div class="menu-item" data-action="savings">
                    <span class="menu-icon">${icon('target')}</span>
                    <span class="menu-label">Savings Goals</span>
                    <span class="menu-arrow">${icon('chevron-right')}</span>
                </div>
                <div class="menu-item" data-action="invoices">
                    <span class="menu-icon">${icon('file-text')}</span>
                    <span class="menu-label">Invoices</span>
                    <span class="menu-arrow">${icon('chevron-right')}</span>
                </div>
                <div class="menu-item" data-action="tax">
                    <span class="menu-icon">${icon('bar-chart')}</span>
                    <span class="menu-label">Tax & Reports</span>
                    <span class="menu-arrow">${icon('chevron-right')}</span>
                </div>
                <div class="menu-item" data-action="sops">
                    <span class="menu-icon">${icon('book-open')}</span>
                    <span class="menu-label">SOPs & Training</span>
                    <span class="menu-arrow">${icon('chevron-right')}</span>
                </div>
                <div class="menu-item" data-action="settings">
                    <span class="menu-icon">${icon('settings')}</span>
                    <span class="menu-label">Settings</span>
                    <span class="menu-arrow">${icon('chevron-right')}</span>
                </div>
            </div>
            </div>
        `;

        view.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => this.openSubView(item.dataset.action));
        });
    },

    async openSubView(action) {
        document.getElementById('bottom-nav').style.display = 'none';
        document.querySelector('.app-header').style.display = 'none';
        document.querySelector('.app-content').style.paddingBottom = '0';

        const content = document.getElementById('view-more');
        const backBtn = document.createElement('button');
        backBtn.className = 'btn btn-outline btn-sm';
        backBtn.style.cssText = 'margin:12px 16px;width:auto;display:inline-flex;gap:6px;align-items:center;';
        backBtn.innerHTML = `${icon('arrow-left', 16)} Back`;

        const container = document.createElement('div');
        container.id = 'sub-view-container';

        content.innerHTML = '';
        content.appendChild(backBtn);
        content.appendChild(container);

        backBtn.addEventListener('click', () => {
            content.innerHTML = '';
            document.getElementById('bottom-nav').style.display = 'flex';
            document.querySelector('.app-header').style.display = 'flex';
            document.querySelector('.app-content').style.paddingBottom = '';
            this.renderMore();
        });

        switch (action) {
            case 'customers': await Customers.render(container); break;
            case 'expenses': await Expenses.render(container); break;
            case 'equipment': await Equipment.render(container); break;
            case 'savings': await Savings.render(container); break;
            case 'invoices': await Invoice.renderList(container); break;
            case 'tax': await Tax.render(container); break;
            case 'sops': await SOP.render(container); break;
            case 'settings': await Settings.render(container); break;
        }
    }
};
