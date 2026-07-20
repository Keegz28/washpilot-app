const Settings = {
    async render(container) {
        const businessName = await Utils.getSetting('businessName', '');
        const businessAddress = await Utils.getSetting('businessAddress', '');
        const businessPhone = await Utils.getSetting('businessPhone', '');
        const lockTimeout = await Utils.getSetting('lockTimeout', 10);

        container.innerHTML = `
            <div style="padding:16px;">
                <h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">Settings</h2>

                <div class="card">
                    <div class="card-header"><span class="card-title">Business Details</span></div>
                    <div class="form-group">
                        <label class="form-label">Business Name</label>
                        <input class="form-input" id="set-name" placeholder="Your business name" value="${Utils.escapeHTML(businessName)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Address</label>
                        <input class="form-input" id="set-address" placeholder="Business address" value="${Utils.escapeHTML(businessAddress)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Phone</label>
                        <input class="form-input" id="set-phone" type="tel" placeholder="Contact number" value="${Utils.escapeHTML(businessPhone)}">
                    </div>
                    <button class="btn btn-primary" id="set-save-details">Save Details</button>
                </div>

                <div class="card">
                    <div class="card-header"><span class="card-title">Security</span></div>
                    <div class="form-group">
                        <label class="form-label">Auto-Lock Timeout (minutes)</label>
                        <input class="form-input" id="set-timeout" type="number" min="1" max="60" value="${lockTimeout}">
                    </div>
                    <button class="btn btn-primary" id="set-save-timeout">Save</button>
                    <button class="btn btn-outline" id="set-change-pin" style="margin-top:8px;width:100%;">Change PIN</button>
                </div>

                <div class="card">
                    <div class="card-header"><span class="card-title">Data</span></div>
                    <button class="btn btn-outline" id="set-export" style="margin-bottom:8px;width:100%;">Export All Data as JSON</button>
                    <button class="btn btn-outline" id="set-import" style="margin-bottom:8px;width:100%;">Import Data from JSON</button>
                    <input type="file" id="set-import-file" accept=".json" style="display:none;">
                    <button class="btn btn-danger" id="set-clear" style="width:100%;">Clear All Data</button>
                </div>

                <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px;">
                    WashPilot v1.0<br>
                    All data stored locally on your device
                </div>
            </div>
        `;

        document.getElementById('set-save-details').addEventListener('click', async () => {
            await Utils.setSetting('businessName', document.getElementById('set-name').value.trim());
            await Utils.setSetting('businessAddress', document.getElementById('set-address').value.trim());
            await Utils.setSetting('businessPhone', document.getElementById('set-phone').value.trim());
            Utils.toast('Business details saved');
        });

        document.getElementById('set-save-timeout').addEventListener('click', async () => {
            const val = parseInt(document.getElementById('set-timeout').value) || 10;
            await Utils.setSetting('lockTimeout', val);
            Auth.timeoutMinutes = val;
            Utils.toast('Timeout updated');
        });

        document.getElementById('set-change-pin').addEventListener('click', () => {
            Utils.showModal('Change PIN', `
                <div class="form-group">
                    <label class="form-label">Current PIN</label>
                    <input class="form-input" id="cpin-current" type="password" maxlength="4" inputmode="numeric">
                </div>
                <div class="form-group">
                    <label class="form-label">New PIN</label>
                    <input class="form-input" id="cpin-new" type="password" maxlength="4" inputmode="numeric">
                </div>
                <div class="form-group">
                    <label class="form-label">Confirm New PIN</label>
                    <input class="form-input" id="cpin-confirm" type="password" maxlength="4" inputmode="numeric">
                </div>
                <button class="btn btn-primary" id="cpin-save">Update PIN</button>
            `);

            document.getElementById('cpin-save').addEventListener('click', async () => {
                const current = document.getElementById('cpin-current').value;
                const newPin = document.getElementById('cpin-new').value;
                const confirm = document.getElementById('cpin-confirm').value;

                if (current.length !== 4) return Utils.toast('Enter current PIN');
                if (newPin.length !== 4) return Utils.toast('Enter new 4-digit PIN');
                if (newPin !== confirm) return Utils.toast('PINs do not match');

                const currentHash = await Auth.hashPin(current);
                const storedHash = await Utils.getSetting('pinHash');
                if (currentHash !== storedHash) return Utils.toast('Current PIN is incorrect');

                const newHash = await Auth.hashPin(newPin);
                await Utils.setSetting('pinHash', newHash);
                Utils.hideModal();
                Utils.toast('PIN updated');
            });
        });

        document.getElementById('set-export').addEventListener('click', async () => {
            const data = {
                customers: await db.customers.toArray(),
                bookings: await db.bookings.toArray(),
                income: await db.income.toArray(),
                expenses: await db.expenses.toArray(),
                equipment: await db.equipment.toArray(),
                savingsGoals: await db.savingsGoals.toArray(),
                invoices: await db.invoices.toArray(),
                sops: await db.sops.toArray(),
                exportDate: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `washpilot_export_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            Utils.toast('Data exported');
        });

        document.getElementById('set-import').addEventListener('click', () => {
            document.getElementById('set-import-file').click();
        });

        document.getElementById('set-import-file').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (!data.exportDate) return Utils.toast('Invalid backup file');

                Utils.showModal('Import Data', `
                    <p style="margin-bottom:12px;">This will merge the following from <strong>${Utils.formatDate(data.exportDate)}</strong>:</p>
                    <ul style="list-style:disc;padding-left:20px;margin-bottom:16px;font-size:14px;color:var(--text-secondary);">
                        <li>${(data.customers || []).length} customers</li>
                        <li>${(data.bookings || []).length} bookings</li>
                        <li>${(data.income || []).length} income records</li>
                        <li>${(data.expenses || []).length} expenses</li>
                        <li>${(data.equipment || []).length} equipment items</li>
                        <li>${(data.savingsGoals || []).length} savings goals</li>
                        <li>${(data.invoices || []).length} invoices</li>
                        <li>${(data.sops || []).length} SOPs</li>
                    </ul>
                    <p style="margin-bottom:16px;font-size:13px;color:var(--text-muted);">Existing data will be preserved. Duplicate IDs will be overwritten.</p>
                    <button class="btn btn-primary" id="set-confirm-import">Import Now</button>
                `);

                document.getElementById('set-confirm-import').addEventListener('click', async () => {
                    let count = 0;
                    const tables = ['customers', 'bookings', 'income', 'expenses', 'equipment', 'savingsGoals', 'invoices', 'sops'];
                    for (const table of tables) {
                        if (data[table] && Array.isArray(data[table])) {
                            await db[table].bulkPut(data[table]);
                            count += data[table].length;
                        }
                    }
                    Utils.hideModal();
                    Utils.toast(`Imported ${count} records`);
                    this.render(container);
                });
            } catch (err) {
                Utils.toast('Error reading file — is it a valid WashPilot backup?');
                console.error(err);
            }
            e.target.value = '';
        });

        document.getElementById('set-clear').addEventListener('click', () => {
            Utils.showModal('Clear All Data?', `
                <p style="margin-bottom:16px;color:var(--danger);">This will permanently delete ALL data. This cannot be undone.</p>
                <button class="btn btn-danger" id="set-confirm-clear">Yes, Delete Everything</button>
            `);

            document.getElementById('set-confirm-clear').addEventListener('click', async () => {
                await db.delete();
                location.reload();
            });
        });
    }
};
