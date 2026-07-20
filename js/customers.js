const Customers = {
    async render(container) {
        const customers = await db.customers.toArray();
        const searchHTML = `
            <div class="search-bar">
                <input type="text" id="cust-search" placeholder="Search customers...">
            </div>
        `;

        let listHTML = '';
        if (customers.length === 0) {
            listHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">No customers yet</div></div>';
        } else {
            listHTML = '<div class="card" id="cust-list">' + customers.sort((a, b) => a.name.localeCompare(b.name)).map(c => `
                <div class="list-item" data-id="${c.id}">
                    <div class="list-icon">👤</div>
                    <div class="list-content">
                        <div class="list-title">${Utils.escapeHTML(c.name)}</div>
                        <div class="list-subtitle">${Utils.escapeHTML(c.phone || 'No phone')} · ${c.visitCount || 0} visits</div>
                    </div>
                    <div class="list-right">
                        <div class="list-amount income">${Utils.formatCurrency(c.totalSpent || 0)}</div>
                    </div>
                </div>
            `).join('') + '</div>';
        }

        container.innerHTML = `
            <div style="padding:16px;">
                <h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">Customers</h2>
                ${searchHTML}
                ${listHTML}
            </div>
        `;

        container.querySelector('#cust-search').addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            container.querySelectorAll('.list-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(q) ? 'flex' : 'none';
            });
        });

        container.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', () => this.showDetail(item.dataset.id, container));
        });
    },

    async showDetail(id, container) {
        const c = await db.customers.get(id);
        if (!c) return;

        const bookings = await db.bookings.where('customerId').equals(id).toArray();
        const history = bookings.sort((a, b) => new Date(b.date) - new Date(a.date)).map(b => `
            <div class="list-item">
                <div class="list-icon">${b.status === 'done' ? '✅' : '📋'}</div>
                <div class="list-content">
                    <div class="list-title">${Utils.formatDate(b.date)}</div>
                    <div class="list-subtitle"><span class="badge badge-${b.status}">${b.status}</span></div>
                </div>
                <div class="list-right"><div class="list-amount income">${Utils.formatCurrency(b.price)}</div></div>
            </div>
        `).join('');

        Utils.showModal(c.name, `
            <p style="margin-bottom:8px;"><strong>Phone:</strong> ${Utils.escapeHTML(c.phone || 'N/A')}</p>
            <p style="margin-bottom:8px;"><strong>Address:</strong> ${Utils.escapeHTML(c.address || 'N/A')}</p>
            <p style="margin-bottom:8px;"><strong>Visits:</strong> ${c.visitCount || 0}</p>
            <p style="margin-bottom:8px;"><strong>Total Spent:</strong> ${Utils.formatCurrency(c.totalSpent || 0)}</p>
            <p style="margin-bottom:8px;"><strong>Notes:</strong> ${Utils.escapeHTML(c.notes || 'None')}</p>
            <div class="section-header" style="margin-top:16px;"><span class="section-title">Visit History</span></div>
            ${history || '<p style="color:var(--text-secondary);">No visits yet</p>'}
            <div class="btn-group" style="margin-top:16px;">
                <button class="btn btn-outline btn-sm" id="cust-edit">Edit</button>
                <button class="btn btn-danger btn-sm" id="cust-delete">Delete</button>
            </div>
        `);

        document.getElementById('cust-edit').addEventListener('click', () => {
            Utils.hideModal();
            setTimeout(() => this.showEditForm(c, container), 200);
        });

        document.getElementById('cust-delete').addEventListener('click', async () => {
            await db.customers.delete(id);
            Utils.hideModal();
            Utils.toast('Customer deleted');
            this.render(container);
        });
    },

    async showEditForm(c, container) {
        Utils.showModal('Edit Customer', `
            <div class="form-group">
                <label class="form-label">Name</label>
                <input class="form-input" id="ec-name" value="${Utils.escapeHTML(c.name)}">
            </div>
            <div class="form-group">
                <label class="form-label">Phone</label>
                <input class="form-input" id="ec-phone" type="tel" value="${Utils.escapeHTML(c.phone || '')}">
            </div>
            <div class="form-group">
                <label class="form-label">Address</label>
                <input class="form-input" id="ec-address" value="${Utils.escapeHTML(c.address || '')}">
            </div>
            <div class="form-group">
                <label class="form-label">Notes</label>
                <textarea class="form-textarea" id="ec-notes">${Utils.escapeHTML(c.notes || '')}</textarea>
            </div>
            <button class="btn btn-primary" id="ec-save">Save Changes</button>
        `);

        document.getElementById('ec-save').addEventListener('click', async () => {
            await db.customers.update(c.id, {
                name: document.getElementById('ec-name').value.trim(),
                phone: document.getElementById('ec-phone').value.trim(),
                address: document.getElementById('ec-address').value.trim(),
                notes: document.getElementById('ec-notes').value.trim()
            });
            Utils.hideModal();
            Utils.toast('Customer updated');
            this.render(container);
        });
    }
};
