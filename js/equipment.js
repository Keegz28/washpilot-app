const Equipment = {
    categories: ['Washing', 'Drying', 'Chemicals', 'Tyre & Wheel', 'Other'],

    async render(container) {
        const items = await db.equipment.toArray();
        const lowStock = items.filter(i => i.quantity <= (i.lowStockAt || 2));

        let listHTML = '';
        if (items.length === 0) {
            listHTML = `<div class="empty-state"><div class="empty-state-icon">${icon('package')}</div><div class="empty-state-text">No equipment tracked yet</div></div>`;
        } else {
            listHTML = items.sort((a, b) => a.name.localeCompare(b.name)).map(i => {
                const isLow = i.quantity <= (i.lowStockAt || 2);
                return `
                    <div class="list-item" data-id="${i.id}">
                        <div class="list-icon ${isLow ? 'red' : 'green'}">${isLow ? icon('alert-circle') : icon('check-circle')}</div>
                        <div class="list-content">
                            <div class="list-title">${Utils.escapeHTML(i.name)}</div>
                            <div class="list-subtitle">${i.category}${i.lowStockAt ? ' · Alert at ' + i.lowStockAt : ''}</div>
                        </div>
                        <div class="list-right"><div style="font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;${isLow ? 'color:var(--red);' : ''}">${i.quantity}</div></div>
                    </div>`;
            }).join('');
        }

        container.innerHTML = `
            <div style="padding:var(--sp-5);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-5);">
                    <h2 style="font-size:22px;font-weight:700;letter-spacing:-0.4px;">Equipment & Stock</h2>
                    <button class="btn btn-primary btn-sm" id="add-equip">Add</button>
                </div>
                ${lowStock.length > 0 ? `<div class="card" style="border-color:var(--red);">
                    <div class="card-header"><span class="card-title" style="color:var(--red);">Low Stock (${lowStock.length})</span></div>
                    ${lowStock.map(i => `<p style="font-size:14px;padding:4px 0;">${Utils.escapeHTML(i.name)} — ${i.quantity} left</p>`).join('')}
                </div>` : ''}
                <div class="section-header"><span class="section-title">All Items</span></div>
                <div class="card">${listHTML}</div>
            </div>
        `;

        container.querySelector('#add-equip').addEventListener('click', () => this.showAddForm());
        container.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', async () => {
                const eq = await db.equipment.get(item.dataset.id);
                if (eq) this.showAddForm(eq);
            });
        });
    },

    async showAddForm(existing) {
        const isEdit = !!existing;
        Utils.showModal(isEdit ? 'Edit Item' : 'Add Equipment', `
            <div class="form-group">
                <label class="form-label">Item Name</label>
                <input class="form-input" id="eq-name" placeholder="e.g. Microfibre Towels" value="${isEdit ? Utils.escapeHTML(existing.name) : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" id="eq-cat">
                    ${this.categories.map(c => `<option value="${c}" ${isEdit && existing.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Quantity</label>
                <input class="form-input" id="eq-qty" type="number" min="0" value="${isEdit ? existing.quantity : 0}">
            </div>
            <div class="form-group">
                <label class="form-label">Low Stock Alert At</label>
                <input class="form-input" id="eq-low" type="number" min="0" placeholder="e.g. 2" value="${isEdit ? existing.lowStockAt || '' : ''}">
            </div>
            <button class="btn btn-primary" id="eq-save">${isEdit ? 'Update' : 'Add Item'}</button>
            ${isEdit ? '<button class="btn btn-danger" id="eq-delete" style="margin-top:8px;">Delete</button>' : ''}
        `);

        document.getElementById('eq-save').addEventListener('click', async () => {
            const name = document.getElementById('eq-name').value.trim();
            if (!name) return Utils.toast('Enter an item name');

            const item = {
                id: isEdit ? existing.id : Utils.generateId(),
                name,
                category: document.getElementById('eq-cat').value,
                quantity: parseInt(document.getElementById('eq-qty').value) || 0,
                lowStockAt: parseInt(document.getElementById('eq-low').value) || 2,
                createdAt: isEdit ? existing.createdAt : new Date()
            };

            await db.equipment.put(item);
            Utils.hideModal();
            Utils.toast(isEdit ? 'Item updated' : 'Item added');
            const container = document.getElementById('sub-view-container');
            if (container) this.render(container);
        });

        if (isEdit) {
            document.getElementById('eq-delete').addEventListener('click', async () => {
                await db.equipment.delete(existing.id);
                Utils.hideModal();
                Utils.toast('Item deleted');
                const container = document.getElementById('sub-view-container');
                if (container) this.render(container);
            });
        }
    }
};
