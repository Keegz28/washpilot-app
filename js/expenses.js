const Expenses = {
    categories: ['Cleaning Supplies', 'Equipment', 'Uniforms', 'Phone & Software', 'Travel', 'Marketing', 'Insurance', 'Other'],

    async render(container) {
        const records = await db.expenses.toArray();
        const monthStart = Utils.getMonthStart();
        const monthTotal = records.filter(r => new Date(r.date) >= monthStart).reduce((s, r) => s + r.amount, 0);
        const yearStart = Utils.getYearStart();
        const yearTotal = records.filter(r => new Date(r.date) >= yearStart).reduce((s, r) => s + r.amount, 0);

        const byCat = {};
        records.filter(r => new Date(r.date) >= monthStart).forEach(r => {
            byCat[r.category] = (byCat[r.category] || 0) + r.amount;
        });

        const catBreakdown = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) =>
            `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px;"><span>${cat}</span><span style="font-weight:600;">${Utils.formatCurrency(amt)}</span></div>`
        ).join('');

        const recent = records.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
        let listHTML = recent.length === 0
            ? `<div class="empty-state"><div class="empty-state-icon">${icon('trending-down')}</div><div class="empty-state-text">No expenses recorded</div></div>`
            : recent.map(r => `
                <div class="list-item" data-id="${r.id}">
                    <div class="list-icon red">${icon('trending-down')}</div>
                    <div class="list-content">
                        <div class="list-title">${Utils.escapeHTML(r.description || r.category)}</div>
                        <div class="list-subtitle">${Utils.formatDate(r.date)} · ${r.category}</div>
                    </div>
                    <div class="list-right"><div class="list-amount expense">-${Utils.formatCurrency(r.amount)}</div></div>
                </div>
            `).join('');

        container.innerHTML = `
            <div style="padding:var(--sp-5);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-5);">
                    <h2 style="font-size:22px;font-weight:700;letter-spacing:-0.4px;">Expenses</h2>
                    <button class="btn btn-primary btn-sm" id="add-expense">Add</button>
                </div>
                <div class="stats-grid">
                    <div class="stat-card danger">
                        <div class="stat-value">${Utils.formatCurrency(monthTotal)}</div>
                        <div class="stat-label">This Month</div>
                    </div>
                    <div class="stat-card danger">
                        <div class="stat-value">${Utils.formatCurrency(yearTotal)}</div>
                        <div class="stat-label">This Year</div>
                    </div>
                </div>
                ${catBreakdown ? `<div class="card"><div class="card-header"><span class="card-title">By Category</span></div>${catBreakdown}</div>` : ''}
                <div class="section-header"><span class="section-title">Recent</span></div>
                <div class="card">${listHTML}</div>
            </div>
        `;

        container.querySelector('#add-expense').addEventListener('click', () => this.showAddForm());
        container.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', async () => {
                const rec = await db.expenses.get(item.dataset.id);
                if (rec) this.showAddForm(rec);
            });
        });
    },

    async showAddForm(existing) {
        const isEdit = !!existing;
        Utils.showModal(isEdit ? 'Edit Expense' : 'Add Expense', `
            <div class="form-group">
                <label class="form-label">Amount (£)</label>
                <input class="form-input" id="exp-amount" type="number" step="0.01" placeholder="0.00" value="${isEdit ? existing.amount : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" id="exp-cat">
                    ${this.categories.map(c => `<option value="${c}" ${isEdit && existing.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Date</label>
                <input class="form-input" id="exp-date" type="date" value="${isEdit ? new Date(existing.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <input class="form-input" id="exp-desc" placeholder="What was it for?" value="${isEdit ? Utils.escapeHTML(existing.description || '') : ''}">
            </div>
            <button class="btn btn-primary" id="exp-save">${isEdit ? 'Update' : 'Save Expense'}</button>
            ${isEdit ? '<button class="btn btn-danger" id="exp-delete" style="margin-top:8px;">Delete</button>' : ''}
        `);

        document.getElementById('exp-save').addEventListener('click', async () => {
            const amount = parseFloat(document.getElementById('exp-amount').value);
            if (!amount || amount <= 0) return Utils.toast('Enter a valid amount');

            const record = {
                id: isEdit ? existing.id : Utils.generateId(),
                amount,
                category: document.getElementById('exp-cat').value,
                date: new Date(document.getElementById('exp-date').value),
                description: document.getElementById('exp-desc').value.trim(),
                createdAt: isEdit ? existing.createdAt : new Date()
            };

            await db.expenses.put(record);
            Utils.hideModal();
            Utils.toast(isEdit ? 'Expense updated' : 'Expense recorded');
            const container = document.getElementById('sub-view-container');
            if (container) this.render(container);
        });

        if (isEdit) {
            document.getElementById('exp-delete').addEventListener('click', async () => {
                await db.expenses.delete(existing.id);
                Utils.hideModal();
                Utils.toast('Expense deleted');
                const container = document.getElementById('sub-view-container');
                if (container) this.render(container);
            });
        }
    }
};
