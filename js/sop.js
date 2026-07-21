const SOP = {
    async render(container) {
        const sops = await db.sops.toArray();

        let listHTML = '';
        if (sops.length === 0) {
            listHTML = `<div class="empty-state"><div class="empty-state-icon">${icon('book-open')}</div><div class="empty-state-text">No SOPs created yet</div></div>`;
        } else {
            listHTML = sops.map(s => `
                <div class="list-item" data-id="${s.id}">
                    <div class="list-icon brand">${icon('book-open')}</div>
                    <div class="list-content">
                        <div class="list-title">${Utils.escapeHTML(s.title)}</div>
                        <div class="list-subtitle">${(s.steps || []).length} steps · Updated ${Utils.formatDate(s.updatedAt || s.createdAt)}</div>
                    </div>
                    <div class="list-right"><span class="menu-arrow">${icon('chevron-right')}</span></div>
                </div>
            `).join('');
        }

        container.innerHTML = `
            <div style="padding:var(--sp-5);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-5);">
                    <h2 style="font-size:22px;font-weight:700;letter-spacing:-0.4px;">SOPs & Training</h2>
                    <button class="btn btn-primary btn-sm" id="add-sop">New SOP</button>
                </div>
                <div class="card">${listHTML}</div>
            </div>
        `;

        container.querySelector('#add-sop').addEventListener('click', () => this.showEditForm());

        container.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', async () => {
                const sop = await db.sops.get(item.dataset.id);
                if (sop) this.showDetail(sop);
            });
        });
    },

    async showDetail(sop) {
        const stepsHTML = (sop.steps || []).length === 0
            ? '<p style="color:var(--text-secondary);">No steps added yet</p>'
            : (sop.steps || []).map((step, i) => `
                <div class="sop-step">
                    <div class="sop-step-num">${i + 1}</div>
                    <div class="sop-step-content">
                        <div class="sop-step-title">${Utils.escapeHTML(step.title)}</div>
                        ${step.description ? `<div class="sop-step-desc">${Utils.escapeHTML(step.description)}</div>` : ''}
                    </div>
                </div>
            `).join('');

        Utils.showModal(sop.title, `
            ${stepsHTML}
            <div class="btn-group" style="margin-top:16px;">
                <button class="btn btn-primary btn-sm" id="sop-edit">Edit SOP</button>
                <button class="btn btn-outline btn-sm" id="sop-export">Export PDF</button>
            </div>
            <button class="btn btn-danger btn-sm" id="sop-delete" style="margin-top:8px;width:100%;">Delete SOP</button>
        `);

        document.getElementById('sop-edit').addEventListener('click', () => {
            Utils.hideModal();
            setTimeout(() => this.showEditForm(sop), 200);
        });

        document.getElementById('sop-export').addEventListener('click', () => {
            this.exportPDF(sop);
        });

        document.getElementById('sop-delete').addEventListener('click', async () => {
            await db.sops.delete(sop.id);
            Utils.hideModal();
            Utils.toast('SOP deleted');
            const container = document.getElementById('sub-view-container');
            if (container) this.render(container);
        });
    },

    async showEditForm(existing) {
        const isEdit = !!existing;
        const steps = isEdit ? [...(existing.steps || [])] : [];

        const renderSteps = () => {
            const stepsList = document.getElementById('sop-steps');
            if (!stepsList) return;
            if (steps.length === 0) {
                stepsList.innerHTML = '<p style="color:var(--text-secondary);font-size:14px;">No steps yet. Add your first step below.</p>';
            } else {
                stepsList.innerHTML = steps.map((s, i) => `
                    <div class="sop-step">
                        <div class="sop-step-num">${i + 1}</div>
                        <div class="sop-step-content">
                            <div class="sop-step-title">${Utils.escapeHTML(s.title)}</div>
                            ${s.description ? `<div class="sop-step-desc">${Utils.escapeHTML(s.description)}</div>` : ''}
                        </div>
                        <button class="btn btn-danger btn-sm rm-step" data-idx="${i}" style="padding:4px 8px;font-size:12px;">X</button>
                    </div>
                `).join('');
                stepsList.querySelectorAll('.rm-step').forEach(btn => {
                    btn.addEventListener('click', () => {
                        steps.splice(parseInt(btn.dataset.idx), 1);
                        renderSteps();
                    });
                });
            }
        };

        Utils.showModal(isEdit ? 'Edit SOP' : 'New SOP', `
            <div class="form-group">
                <label class="form-label">SOP Title</label>
                <input class="form-input" id="sop-title" placeholder="e.g. Exterior Wash Procedure" value="${isEdit ? Utils.escapeHTML(existing.title) : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Steps</label>
                <div id="sop-steps"></div>
            </div>
            <div style="background:var(--bg-input);border-radius:var(--r-sm);padding:12px;margin-bottom:16px;border:1px solid var(--border);">
                <div class="form-group" style="margin-bottom:8px;">
                    <input class="form-input" id="new-step-title" placeholder="Step title">
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                    <textarea class="form-textarea" id="new-step-desc" placeholder="Description (optional)" style="min-height:60px;"></textarea>
                </div>
                <button class="btn btn-outline btn-sm" id="add-step" style="width:100%;">Add Step</button>
            </div>
            <button class="btn btn-primary" id="sop-save">${isEdit ? 'Update SOP' : 'Create SOP'}</button>
        `);

        renderSteps();

        document.getElementById('add-step').addEventListener('click', () => {
            const title = document.getElementById('new-step-title').value.trim();
            if (!title) return Utils.toast('Enter a step title');
            steps.push({
                title,
                description: document.getElementById('new-step-desc').value.trim()
            });
            document.getElementById('new-step-title').value = '';
            document.getElementById('new-step-desc').value = '';
            renderSteps();
        });

        document.getElementById('sop-save').addEventListener('click', async () => {
            const title = document.getElementById('sop-title').value.trim();
            if (!title) return Utils.toast('Enter a title');
            if (steps.length === 0) return Utils.toast('Add at least one step');

            await db.sops.put({
                id: isEdit ? existing.id : Utils.generateId(),
                title,
                steps,
                createdAt: isEdit ? existing.createdAt : new Date(),
                updatedAt: new Date()
            });

            Utils.hideModal();
            Utils.toast(isEdit ? 'SOP updated' : 'SOP created');
            const container = document.getElementById('sub-view-container');
            if (container) this.render(container);
        });
    },

    exportPDF(sop) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.setFontSize(22);
            doc.setFont(undefined, 'bold');
            doc.text(sop.title, 20, 25);

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(120, 120, 120);
            doc.text(`WashPilot · ${Utils.formatDate(new Date())}`, 20, 33);

            doc.setDrawColor(200, 200, 200);
            doc.line(20, 37, 190, 37);

            let y = 47;
            (sop.steps || []).forEach((step, i) => {
                if (y > 260) { doc.addPage(); y = 20; }

                doc.setFillColor(59, 130, 246);
                doc.circle(25, y - 2, 4, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                doc.text(String(i + 1), 25, y - 0.5, { align: 'center' });

                doc.setTextColor(15, 23, 42);
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(step.title, 34, y);

                if (step.description) {
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(100, 116, 139);
                    const lines = doc.splitTextToSize(step.description, 150);
                    doc.text(lines, 34, y + 7);
                    y += 7 + (lines.length * 5);
                }

                y += 12;
            });

            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Generated by WashPilot', 105, 285, { align: 'center' });

            doc.save(`${sop.title.replace(/[^a-z0-9]/gi, '_')}_SOP.pdf`);
            Utils.toast('PDF exported');
        } catch (e) {
            Utils.toast('Error generating PDF');
            console.error(e);
        }
    }
};
