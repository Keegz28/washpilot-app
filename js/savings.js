const Savings = {
    async render(container) {
        const goals = await db.savingsGoals.toArray();
        const allIncome = await db.income.toArray();
        const avgDaily = this.calcAvgDailyIncome(allIncome);

        let goalsHTML = '';
        if (goals.length === 0) {
            goalsHTML = '<div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-text">No savings goals yet</div></div>';
        } else {
            goalsHTML = goals.map(g => {
                const pct = g.targetAmount > 0 ? Math.min(100, ((g.currentAmount || 0) / g.targetAmount) * 100) : 0;
                const remaining = Math.max(0, g.targetAmount - (g.currentAmount || 0));
                const daysLeft = avgDaily > 0 ? Math.ceil(remaining / avgDaily) : '∞';
                return `
                    <div class="card" data-id="${g.id}" style="cursor:pointer;">
                        <div class="card-header">
                            <span class="card-title">${Utils.escapeHTML(g.name)}</span>
                            <span class="card-subtitle">${pct.toFixed(0)}%</span>
                        </div>
                        <div class="progress-bar"><div class="progress-fill${pct >= 100 ? ' success' : ''}" style="width:${pct}%"></div></div>
                        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:13px;color:var(--text-secondary);">
                            <span>${Utils.formatCurrency(g.currentAmount || 0)} saved</span>
                            <span>Target: ${Utils.formatCurrency(g.targetAmount)}</span>
                        </div>
                        ${remaining > 0 ? `<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">~${daysLeft} days to go at current rate</div>` : '<div style="font-size:12px;color:var(--success);margin-top:4px;">Goal reached! 🎉</div>'}
                        <div style="margin-top:12px;display:flex;gap:8px;">
                            <button class="btn btn-primary btn-sm add-funds-btn" data-id="${g.id}">+ Add Funds</button>
                            <button class="btn btn-outline btn-sm edit-goal-btn" data-id="${g.id}">Edit</button>
                            <button class="btn btn-danger btn-sm del-goal-btn" data-id="${g.id}">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        container.innerHTML = `
            <div style="padding:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h2 style="font-size:22px;font-weight:700;">Savings Goals</h2>
                    <button class="btn btn-primary btn-sm" id="add-goal">+ New Goal</button>
                </div>
                <div class="card" style="margin-bottom:16px;">
                    <div class="card-title" style="margin-bottom:4px;">Avg Daily Income</div>
                    <div style="font-size:20px;font-weight:700;color:var(--success);">${Utils.formatCurrency(avgDaily)}</div>
                    <div style="font-size:12px;color:var(--text-tertiary);">Based on last 30 days</div>
                </div>
                ${goalsHTML}
            </div>
        `;

        container.querySelector('#add-goal').addEventListener('click', () => this.showGoalForm());

        container.querySelectorAll('.add-funds-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                this.showAddFunds(btn.dataset.id);
            });
        });

        container.querySelectorAll('.edit-goal-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                db.savingsGoals.get(btn.dataset.id).then(g => {
                    if (g) this.showGoalForm(g);
                });
            });
        });

        container.querySelectorAll('.del-goal-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.stopPropagation();
                await db.savingsGoals.delete(btn.dataset.id);
                Utils.toast('Goal deleted');
                this.render(container);
            });
        });
    },

    calcAvgDailyIncome(income) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recent = income.filter(i => new Date(i.date) >= thirtyDaysAgo);
        const total = recent.reduce((s, i) => s + i.amount, 0);
        return total / 30;
    },

    async showGoalForm(existing) {
        const isEdit = !!existing;
        Utils.showModal(isEdit ? 'Edit Goal' : 'New Savings Goal', `
            <div class="form-group">
                <label class="form-label">Goal Name</label>
                <input class="form-input" id="sg-name" placeholder="e.g. Electric Utility Cart" value="${isEdit ? Utils.escapeHTML(existing.name) : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Target Amount (£)</label>
                <input class="form-input" id="sg-target" type="number" step="0.01" placeholder="2500.00" value="${isEdit ? existing.targetAmount : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Already Saved (£)</label>
                <input class="form-input" id="sg-current" type="number" step="0.01" placeholder="0.00" value="${isEdit ? existing.currentAmount || 0 : 0}">
            </div>
            <button class="btn btn-primary" id="sg-save">${isEdit ? 'Update Goal' : 'Create Goal'}</button>
        `);

        document.getElementById('sg-save').addEventListener('click', async () => {
            const name = document.getElementById('sg-name').value.trim();
            const target = parseFloat(document.getElementById('sg-target').value);
            if (!name) return Utils.toast('Enter a goal name');
            if (!target || target <= 0) return Utils.toast('Enter a valid target amount');

            await db.savingsGoals.put({
                id: isEdit ? existing.id : Utils.generateId(),
                name,
                targetAmount: target,
                currentAmount: parseFloat(document.getElementById('sg-current').value) || 0,
                createdAt: isEdit ? existing.createdAt : new Date()
            });

            Utils.hideModal();
            Utils.toast(isEdit ? 'Goal updated' : 'Goal created');
            const container = document.getElementById('sub-view-container');
            if (container) this.render(container);
        });
    },

    async showAddFunds(goalId) {
        const goal = await db.savingsGoals.get(goalId);
        if (!goal) return;

        Utils.showModal(`Add to "${goal.name}"`, `
            <p style="margin-bottom:12px;">Current: ${Utils.formatCurrency(goal.currentAmount || 0)} / ${Utils.formatCurrency(goal.targetAmount)}</p>
            <div class="form-group">
                <label class="form-label">Amount to Add (£)</label>
                <input class="form-input" id="af-amount" type="number" step="0.01" placeholder="0.00">
            </div>
            <button class="btn btn-primary" id="af-save">Add Funds</button>
        `);

        document.getElementById('af-save').addEventListener('click', async () => {
            const amount = parseFloat(document.getElementById('af-amount').value);
            if (!amount || amount <= 0) return Utils.toast('Enter a valid amount');

            await db.savingsGoals.update(goalId, {
                currentAmount: (goal.currentAmount || 0) + amount
            });

            Utils.hideModal();
            Utils.toast(`${Utils.formatCurrency(amount)} added!`);
            const container = document.getElementById('sub-view-container');
            if (container) this.render(container);
        });
    }
};
