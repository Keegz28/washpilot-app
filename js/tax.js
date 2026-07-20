const Tax = {
    async render(container) {
        const yearStart = Utils.getYearStart();
        const allIncome = await db.income.toArray();
        const allExpenses = await db.expenses.toArray();

        const yearIncome = allIncome.filter(i => new Date(i.date) >= yearStart).reduce((s, i) => s + i.amount, 0);
        const yearExpenses = allExpenses.filter(e => new Date(e.date) >= yearStart).reduce((s, e) => s + e.amount, 0);
        const netProfit = yearIncome - yearExpenses;

        const ukTaxBands = [
            { name: 'Personal Allowance', limit: 12570, rate: 0 },
            { name: 'Basic Rate', limit: 50270, rate: 0.20 },
            { name: 'Higher Rate', limit: 125140, rate: 0.40 },
            { name: 'Additional Rate', limit: Infinity, rate: 0.45 }
        ];

        let taxOwed = 0;
        let remaining = Math.max(0, netProfit);
        let prevLimit = 0;
        const breakdown = [];

        for (const band of ukTaxBands) {
            const bandWidth = band.limit - prevLimit;
            const taxable = Math.min(remaining, bandWidth);
            const tax = taxable * band.rate;
            taxOwed += tax;
            if (taxable > 0) {
                breakdown.push({ name: band.name, amount: taxable, rate: band.rate, tax });
            }
            remaining -= taxable;
            prevLimit = band.limit;
            if (remaining <= 0) break;
        }

        const niRate = 0.09;
        const niThreshold = 12570;
        const niable = Math.max(0, netProfit - niThreshold);
        const niOwed = niable * niRate;

        const categoryTotals = {};
        allExpenses.filter(e => new Date(e.date) >= yearStart).forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });

        const catRows = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt]) =>
            `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span>${cat}</span><span style="font-weight:600;">${Utils.formatCurrency(amt)}</span></div>`
        ).join('');

        container.innerHTML = `
            <div style="padding:16px;">
                <h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">Tax & Reports</h2>
                <div class="stats-grid">
                    <div class="stat-card success">
                        <div class="stat-value">${Utils.formatCurrency(yearIncome)}</div>
                        <div class="stat-label">Gross Income</div>
                    </div>
                    <div class="stat-card danger">
                        <div class="stat-value">${Utils.formatCurrency(yearExpenses)}</div>
                        <div class="stat-label">Expenses</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Utils.formatCurrency(netProfit)}</div>
                        <div class="stat-label">Net Profit</div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-value">${Utils.formatCurrency(taxOwed + niOwed)}</div>
                        <div class="stat-label">Est. Tax + NI</div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><span class="card-title">Tax Breakdown</span></div>
                    ${breakdown.map(b => `
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px;">
                            <span>${b.name} (${(b.rate * 100).toFixed(0)}%)</span>
                            <span>${Utils.formatCurrency(b.tax)}</span>
                        </div>
                    `).join('')}
                    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;font-weight:600;border-top:2px solid var(--border);margin-top:4px;">
                        <span>Income Tax</span><span>${Utils.formatCurrency(taxOwed)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:var(--text-secondary);">
                        <span>National Insurance (9%)</span><span>${Utils.formatCurrency(niOwed)}</span>
                    </div>
                </div>
                ${catRows ? `
                    <div class="card">
                        <div class="card-header"><span class="card-title">Expenses by Category</span></div>
                        ${catRows}
                    </div>
                ` : ''}
                <button class="btn btn-primary" id="tax-export" style="margin-top:8px;">Export Report as Text</button>
                <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px;">Estimates based on 2024/25 UK tax rates. Consult an accountant for accurate figures.</p>
            </div>
        `;

        document.getElementById('tax-export').addEventListener('click', () => {
            const report = `WashPilot Tax Report — ${new Date().getFullYear()}\n${'='.repeat(40)}\n\nGross Income: ${Utils.formatCurrency(yearIncome)}\nExpenses: ${Utils.formatCurrency(yearExpenses)}\nNet Profit: ${Utils.formatCurrency(netProfit)}\n\nIncome Tax: ${Utils.formatCurrency(taxOwed)}\nNational Insurance: ${Utils.formatCurrency(niOwed)}\nTotal Estimated: ${Utils.formatCurrency(taxOwed + niOwed)}\n\nExpenses Breakdown:\n${Object.entries(categoryTotals).map(([c, a]) => `  ${c}: ${Utils.formatCurrency(a)}`).join('\n')}\n\nGenerated by WashPilot`;
            navigator.clipboard.writeText(report).then(() => Utils.toast('Report copied to clipboard'));
        });
    }
};
