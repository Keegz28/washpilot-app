const Bookings = {
    filter: 'all',

    async render() {
        const view = document.getElementById('view-bookings');
        const bookings = await db.bookings.orderBy('date').reverse().toArray();
        const customers = await db.customers.toArray();
        const custMap = {};
        customers.forEach(c => custMap[c.id] = c.name);

        const headerBtn = document.getElementById('header-action');
        headerBtn.style.display = 'flex';
        headerBtn.innerHTML = `${icon('plus', 16)} New`;
        headerBtn.onclick = () => this.showAddForm();

        const filtered = this.filter === 'all' ? bookings : bookings.filter(b => b.status === this.filter);

        let listHTML = '';
        if (filtered.length === 0) {
            listHTML = `<div class="empty-state"><div class="empty-state-icon">${icon('calendar')}</div><div class="empty-state-text">No bookings yet</div></div>`;
        } else {
            listHTML = filtered.map(b => {
                const statusIcon = b.status === 'done' ? icon('check-circle') : b.status === 'in-progress' ? icon('clock') : icon('calendar');
                const iconClass = b.status === 'done' ? 'green' : b.status === 'in-progress' ? 'amber' : 'brand';
                const statusBadge = `<span class="badge badge-${b.status === 'done' ? 'done' : b.status === 'in-progress' ? 'progress' : b.status === 'cancelled' ? 'cancelled' : 'booked'}">${b.status}</span>`;
                const priorityBadge = b.priority ? '<span class="badge badge-priority">Priority</span>' : '';
                return `
                    <div class="list-item" data-id="${b.id}">
                        <div class="list-icon ${iconClass}">${statusIcon}</div>
                        <div class="list-content">
                            <div class="list-title">${Utils.escapeHTML(b.customerName || custMap[b.customerId] || 'Unknown')}</div>
                            <div class="list-subtitle">${Utils.formatDate(b.date)} ${Utils.formatTime(b.date)} ${priorityBadge}</div>
                        </div>
                        <div class="list-right">${statusBadge}</div>
                    </div>`;
            }).join('');
        }

        view.innerHTML = `
            <div class="filter-chips">
                <button class="filter-chip ${this.filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                <button class="filter-chip ${this.filter === 'booked' ? 'active' : ''}" data-filter="booked">Booked</button>
                <button class="filter-chip ${this.filter === 'in-progress' ? 'active' : ''}" data-filter="in-progress">In Progress</button>
                <button class="filter-chip ${this.filter === 'done' ? 'active' : ''}" data-filter="done">Done</button>
                <button class="filter-chip ${this.filter === 'cancelled' ? 'active' : ''}" data-filter="cancelled">Cancelled</button>
            </div>
            <div class="card">${listHTML}</div>
        `;

        view.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.filter = chip.dataset.filter;
                this.render();
            });
        });

        view.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', () => this.showDetail(item.dataset.id));
        });
    },

    async showAddForm(existing) {
        const customers = await db.customers.toArray();
        const custOptions = customers.map(c => `<option value="${c.id}">${Utils.escapeHTML(c.name)}</option>`).join('');
        const isEdit = !!existing;

        Utils.showModal(isEdit ? 'Edit Booking' : 'New Booking', `
            <div class="form-group">
                <label class="form-label">Customer</label>
                <select class="form-select" id="bk-customer">
                    <option value="">Select or type new below</option>
                    ${custOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Customer Name</label>
                <input class="form-input" id="bk-name" placeholder="Full name" value="${isEdit ? Utils.escapeHTML(existing.customerName || '') : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Phone</label>
                <input class="form-input" id="bk-phone" type="tel" placeholder="Phone number" value="${isEdit ? Utils.escapeHTML(existing.phone || '') : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Address</label>
                <input class="form-input" id="bk-address" placeholder="Full address" value="${isEdit ? Utils.escapeHTML(existing.address || '') : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Date & Time</label>
                <input class="form-input" id="bk-datetime" type="datetime-local" value="${isEdit ? new Date(existing.date).toISOString().slice(0, 16) : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Price (£)</label>
                <input class="form-input" id="bk-price" type="number" step="0.01" placeholder="0.00" value="${isEdit ? existing.price || '' : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Notes</label>
                <textarea class="form-textarea" id="bk-notes" placeholder="Optional notes">${isEdit ? Utils.escapeHTML(existing.notes || '') : ''}</textarea>
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:12px;">
                <input type="checkbox" id="bk-priority" ${isEdit && existing.priority ? 'checked' : ''} style="width:20px;height:20px;">
                <label for="bk-priority" style="font-size:15px;">Priority Booking</label>
            </div>
            <button class="btn btn-primary" id="bk-save">${isEdit ? 'Update Booking' : 'Save Booking'}</button>
            ${isEdit ? '<button class="btn btn-danger" id="bk-delete" style="margin-top:8px;">Delete Booking</button>' : ''}
        `);

        document.getElementById('bk-save').addEventListener('click', async () => {
            const customerId = document.getElementById('bk-customer').value;
            const name = document.getElementById('bk-name').value.trim();
            const phone = document.getElementById('bk-phone').value.trim();
            const address = document.getElementById('bk-address').value.trim();
            const datetime = document.getElementById('bk-datetime').value;
            const price = parseFloat(document.getElementById('bk-price').value) || 0;
            const notes = document.getElementById('bk-notes').value.trim();
            const priority = document.getElementById('bk-priority').checked;

            if (!name) return Utils.toast('Enter a customer name');
            if (!datetime) return Utils.toast('Select a date & time');

            let custId = customerId;
            if (!custId && name) {
                custId = Utils.generateId();
                await db.customers.put({
                    id: custId, name, phone, address,
                    createdAt: new Date(), totalSpent: 0, visitCount: 0, notes: ''
                });
            } else if (custId) {
                if (phone) await db.customers.update(custId, { phone });
                if (address) await db.customers.update(custId, { address });
            }

            const booking = {
                id: isEdit ? existing.id : Utils.generateId(),
                customerId: custId, customerName: name, phone, address,
                date: new Date(datetime), price, notes, priority,
                status: isEdit ? existing.status : 'booked',
                createdAt: isEdit ? existing.createdAt : new Date()
            };

            await db.bookings.put(booking);
            Utils.hideModal();
            Utils.toast(isEdit ? 'Booking updated' : 'Booking created');
            this.render();
        });

        if (isEdit) {
            document.getElementById('bk-delete').addEventListener('click', async () => {
                await db.bookings.delete(existing.id);
                Utils.hideModal();
                Utils.toast('Booking deleted');
                this.render();
            });
        }
    },

    async showDetail(id) {
        const b = await db.bookings.get(id);
        if (!b) return;

        Utils.showModal(b.customerName || 'Booking', `
            <div style="margin-bottom:16px;">
                <span class="badge badge-${b.status === 'done' ? 'done' : b.status === 'in-progress' ? 'progress' : b.status === 'cancelled' ? 'cancelled' : 'booked'}">${b.status}</span>
                ${b.priority ? '<span class="badge badge-priority" style="margin-left:4px;">Priority</span>' : ''}
            </div>
            <p style="margin-bottom:8px;"><strong>Date:</strong> ${Utils.formatDateTime(b.date)}</p>
            <p style="margin-bottom:8px;"><strong>Phone:</strong> ${Utils.escapeHTML(b.phone || 'N/A')}</p>
            <p style="margin-bottom:8px;"><strong>Address:</strong> ${Utils.escapeHTML(b.address || 'N/A')}</p>
            <p style="margin-bottom:8px;"><strong>Price:</strong> ${Utils.formatCurrency(b.price)}</p>
            ${b.notes ? `<p style="margin-bottom:8px;"><strong>Notes:</strong> ${Utils.escapeHTML(b.notes)}</p>` : ''}
            <div class="btn-group" style="margin-top:16px;">
                <button class="btn btn-outline btn-sm" id="bk-edit">Edit</button>
                ${b.status === 'booked' ? '<button class="btn btn-primary btn-sm" id="bk-start">Start Job</button>' : ''}
                ${b.status === 'in-progress' ? '<button class="btn btn-success btn-sm" id="bk-complete">Mark Done</button>' : ''}
            </div>
            ${b.status !== 'cancelled' && b.status !== 'done' ? '<button class="btn btn-outline btn-sm" id="bk-cancel" style="margin-top:8px;width:100%;color:var(--red);">Cancel Booking</button>' : ''}
            ${b.status === 'done' ? '<button class="btn btn-outline btn-sm" id="bk-invoice" style="margin-top:8px;width:100%;">Generate Invoice</button>' : ''}
        `);

        document.getElementById('bk-edit').addEventListener('click', () => {
            Utils.hideModal();
            setTimeout(() => this.showAddForm(b), 200);
        });

        if (b.status === 'booked') {
            document.getElementById('bk-start').addEventListener('click', async () => {
                await db.bookings.update(id, { status: 'in-progress' });
                Utils.hideModal();
                Utils.toast('Job started');
                this.render();
            });
        }

        if (b.status === 'in-progress') {
            document.getElementById('bk-complete').addEventListener('click', async () => {
                await db.bookings.update(id, { status: 'done' });
                if (b.customerId) {
                    const cust = await db.customers.get(b.customerId);
                    if (cust) {
                        await db.customers.update(b.customerId, {
                            visitCount: (cust.visitCount || 0) + 1,
                            totalSpent: (cust.totalSpent || 0) + (b.price || 0)
                        });
                    }
                }
                Utils.hideModal();
                Utils.toast('Job completed');

                Utils.showModal('Record Payment?', `
                    <p style="margin-bottom:16px;">Record payment for ${Utils.escapeHTML(b.customerName || 'this job')}?</p>
                    <div class="btn-group">
                        <button class="btn btn-success btn-sm" id="bk-pay-yes">Record Payment</button>
                        <button class="btn btn-outline btn-sm" id="bk-pay-no">Skip</button>
                    </div>
                `);

                document.getElementById('bk-pay-yes').addEventListener('click', () => {
                    Utils.hideModal();
                    setTimeout(() => Income.showAddForm({
                        bookingId: b.id, amount: b.price || 0,
                        description: `Exterior Wash - ${b.customerName || ''}`,
                        paymentMethod: 'cash'
                    }), 200);
                });

                document.getElementById('bk-pay-no').addEventListener('click', () => {
                    Utils.hideModal();
                    this.render();
                });
            });
        }

        if (b.status !== 'cancelled' && b.status !== 'done') {
            document.getElementById('bk-cancel').addEventListener('click', async () => {
                await db.bookings.update(id, { status: 'cancelled' });
                Utils.hideModal();
                Utils.toast('Booking cancelled');
                this.render();
            });
        }

        if (b.status === 'done') {
            document.getElementById('bk-invoice').addEventListener('click', () => {
                Utils.hideModal();
                setTimeout(() => Invoice.generate(b), 200);
            });
        }
    }
};
