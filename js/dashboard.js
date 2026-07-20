const Dashboard = {
    async render() {
        const view = document.getElementById('view-dashboard');
        const today = Utils.today();
        const weekStart = Utils.getWeekStart();
        const monthStart = Utils.getMonthStart();

        const allBookings = await db.bookings.toArray();
        const allIncome = await db.income.toArray();
        const allExpenses = await db.expenses.toArray();
        const goals = await db.savingsGoals.toArray();

        const todayBookings = allBookings.filter(b => {
            const bd = new Date(b.date);
            bd.setHours(0, 0, 0, 0);
            return bd.getTime() === today.getTime() && b.status !== 'cancelled';
        });

        const weekIncome = allIncome.filter(i => new Date(i.date) >= weekStart).reduce((s, i) => s + i.amount, 0);
        const monthIncome = allIncome.filter(i => new Date(i.date) >= monthStart).reduce((s, i) => s + i.amount, 0);
        const monthExpenses = allExpenses.filter(e => new Date(e.date) >= monthStart).reduce((s, e) => s + e.amount, 0);
        const totalSaved = goals.reduce((s, g) => s + (g.currentAmount || 0), 0);
        const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || 0), 0);

        let goalsHTML = '';
        if (goals.length > 0) {
            const pct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
            goalsHTML = `
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Savings Goals</span>
                        <span class="card-subtitle">${Utils.formatCurrency(totalSaved)} of ${Utils.formatCurrency(totalTarget)}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill${pct >= 100 ? ' success' : ''}" style="width:${pct}%"></div></div>
                </div>
            `;
        }

        let bookingsHTML = '';
        if (todayBookings.length > 0) {
            bookingsHTML = todayBookings.sort((a, b) => {
                if (a.priority && !b.priority) return -1;
                if (!a.priority && b.priority) return 1;
                return new Date(a.date) - new Date(b.date);
            }).map(b => `
                <div class="list-item">
                    <div class="list-icon">${b.status === 'done' ? '✅' : b.status === 'in-progress' ? '🔧' : '📋'}</div>
                    <div class="list-content">
                        <div class="list-title">${Utils.escapeHTML(b.customerName || 'Unknown')}</div>
                        <div class="list-subtitle">${Utils.formatTime(b.date)} ${b.priority ? '<span class="badge badge-priority">Priority</span>' : ''}</div>
                    </div>
                    <div class="list-right">
                        <span class="badge badge-${b.status === 'done' ? 'done' : b.status === 'in-progress' ? 'progress' : 'booked'}">${b.status}</span>
                    </div>
                </div>
            `).join('');
        } else {
            bookingsHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">No jobs today</div></div>';
        }

        view.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${todayBookings.length}</div>
                    <div class="stat-label">Today's Jobs</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-value">${Utils.formatCurrency(weekIncome)}</div>
                    <div class="stat-label">This Week</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Utils.formatCurrency(monthIncome)}</div>
                    <div class="stat-label">This Month</div>
                </div>
                <div class="stat-card danger">
                    <div class="stat-value">${Utils.formatCurrency(monthExpenses)}</div>
                    <div class="stat-label">Month Expenses</div>
                </div>
            </div>
            ${goalsHTML}
            <div class="section-header">
                <span class="section-title">Today's Schedule</span>
            </div>
            <div class="card">
                ${bookingsHTML}
            </div>
        `;
    }
};
