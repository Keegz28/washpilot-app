const Income = {
    async render() {
        const view = document.getElementById('view-income');
        const records = await db.income.toArray();
        const today = Utils.today();
        const weekStart = Utils.getWeekStart();
        const monthStart = Utils.getMonthStart();

        const todayIncome = records.filter(r => {
            const d = new Date(r.date); d.setHours(0,0,0,0);
            return d.getTime() === today.getTime();
        }).reduce((s, r) => s + r.amount, 0);

        const weekIncome = records.filter(r => new Date(r.date) >= weekStart).reduce((s, r) => s + r.amount, 0);
        const monthIncome = records.filter(r => new Date(r.date) >= monthStart).reduce((s, r) => s + r.amount, 0);

        const byMethod = { cash: 0, bank: 0, card: 0 };
        records.filter(r => new Date(r.date) >= monthStart).forEach(r => {
            byMethod[r.paymentMethod] = (byMethod[r.paymentMethod] || 0) + r.amount;
        });

        const recent = records.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
        let listHTML = recent.length === 0
            ? `<div class="empty-state"><div class="empty-state-icon">${icon('dollar-sign')}</div><div class="empty-state-text">No income recorded yet</div></div>`
            : recent.map(r => {
                const methodIcon = r.paymentMethod === 'cash' ? icon('dollar-sign') : r.paymentMethod === 'bank' ? icon('building') : icon('credit-card');
                const methodClass = r.paymentMethod === 'cash' ? 'green' : r.paymentMethod === 'bank' ? 'brand' : '';
                return `
                <div class="list-item" data-id="${r.id}">
                    <div class="list-icon ${methodClass}">${methodIcon}</div>
                    <div class="list-content">
                        <div class="list-title">${Utils.escapeHTML(r.description || 'Payment')}</div>
                        <div class="list-subtitle">${Utils.formatDate(r.date)} <span class="badge badge-${r.paymentMethod}">${r.paymentMethod}</span></div>
                    </div>
                    <div class="list-right"><div class="list-amount income">${Utils.formatCurrency(r.amount)}</div></div>
                </div>`;
            }).join('');

        const headerBtn = document.getElementById('header-action');
        headerBtn.style.display = 'flex';
        headerBtn.innerHTML = `${icon('plus', 16)} Add`;
        headerBtn.onclick = () => this.showAddForm();

        view.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card success">
                    <div class="stat-value">${Utils.formatCurrency(todayIncome)}</div>
                    <div class="stat-label">Today</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-value">${Utils.formatCurrency(weekIncome)}</div>
                    <div class="stat-label">This Week</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Utils.formatCurrency(monthIncome)}</div>
                    <div class="stat-label">Month</div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><span class="card-title">By Method (Month)</span></div>
                <div style="display:flex;gap:16px;font-size:14px;">
                    <span>Cash: ${Utils.formatCurrency(byMethod.cash)}</span>
                    <span>Bank: ${Utils.formatCurrency(byMethod.bank)}</span>
                    <span>Card: ${Utils.formatCurrency(byMethod.card)}</span>
                </div>
            </div>
            <div class="section-header"><span class="section-title">Recent</span></div>
            <div class="card">${listHTML}</div>
        `;

        view.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', async () => {
                const rec = await db.income.get(item.dataset.id);
                if (rec) this.showDetail(rec);
            });
        });
    },

    async showAddForm(existing) {
        const isEdit = !!(existing && existing.id);
        const prefill = existing && !isEdit ? existing : {};
        Utils.showModal(isEdit ? 'Edit Income' : 'Record Income', `
            <div class="form-group">
                <label class="form-label">Amount (£)</label>
                <input class="form-input" id="inc-amount" type="number" step="0.01" placeholder="0.00" value="${isEdit ? existing.amount : (prefill.amount || '')}">
            </div>
            <div class="form-group">
                <label class="form-label">Payment Method</label>
                <select class="form-select" id="inc-method">
                    <option value="cash" ${((isEdit ? existing.paymentMethod : prefill.paymentMethod) === 'cash') ? 'selected' : ''}>Cash</option>
                    <option value="bank" ${((isEdit ? existing.paymentMethod : prefill.paymentMethod) === 'bank') ? 'selected' : ''}>Bank Transfer</option>
                    <option value="card" ${((isEdit ? existing.paymentMethod : prefill.paymentMethod) === 'card') ? 'selected' : ''}>Card Reader</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Date</label>
                <input class="form-input" id="inc-date" type="date" value="${isEdit ? new Date(existing.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <input class="form-input" id="inc-desc" placeholder="e.g. Exterior Wash - Mrs Smith" value="${isEdit ? Utils.escapeHTML(existing.description || '') : Utils.escapeHTML(prefill.description || '')}">
            </div>
            <div class="form-group">
                <label class="form-label">Linked Booking (optional)</label>
                <select class="form-select" id="inc-booking">
                    <option value="">None</option>
                    ${(await db.bookings.where('status').equals('done').toArray()).map(b => `<option value="${b.id}" ${(isEdit && existing.bookingId === b.id) || prefill.bookingId === b.id ? 'selected' : ''}>${Utils.escapeHTML(b.customerName || 'Unknown')} - ${Utils.formatDate(b.date)}</option>`).join('')}
                </select>
            </div>
            <button class="btn btn-primary" id="inc-save">${isEdit ? 'Update' : 'Save Income'}</button>
            ${isEdit ? '<button class="btn btn-danger" id="inc-delete" style="margin-top:8px;">Delete</button>' : ''}
        `);

        document.getElementById('inc-save').addEventListener('click', async () => {
            const amount = parseFloat(document.getElementById('inc-amount').value);
            if (!amount || amount <= 0) return Utils.toast('Enter a valid amount');

            const record = {
                id: isEdit ? existing.id : Utils.generateId(),
                amount,
                paymentMethod: document.getElementById('inc-method').value,
                date: new Date(document.getElementById('inc-date').value),
                description: document.getElementById('inc-desc').value.trim(),
                bookingId: document.getElementById('inc-booking').value || null,
                createdAt: isEdit ? existing.createdAt : new Date()
            };

            await db.income.put(record);
            Utils.hideModal();
            Utils.toast(isEdit ? 'Income updated' : 'Income recorded');
            this.render();
        });

        if (isEdit) {
            document.getElementById('inc-delete').addEventListener('click', async () => {
                await db.income.delete(existing.id);
                Utils.hideModal();
                Utils.toast('Income record deleted');
                this.render();
            });
        }
    },

    async showDetail(rec) {
        Utils.showModal('Income Details', `
            <p style="margin-bottom:8px;"><strong>Amount:</strong> ${Utils.formatCurrency(rec.amount)}</p>
            <p style="margin-bottom:8px;"><strong>Method:</strong> <span class="badge badge-${rec.paymentMethod}">${rec.paymentMethod}</span></p>
            <p style="margin-bottom:8px;"><strong>Date:</strong> ${Utils.formatDate(rec.date)}</p>
            <p style="margin-bottom:8px;"><strong>Description:</strong> ${Utils.escapeHTML(rec.description || 'N/A')}</p>
            <div class="btn-group" style="margin-top:16px;">
                <button class="btn btn-outline btn-sm" id="inc-detail-edit">Edit</button>
            </div>
        `);

        document.getElementById('inc-detail-edit').addEventListener('click', () => {
            Utils.hideModal();
            setTimeout(() => this.showAddForm(rec), 200);
        });
    }
};
