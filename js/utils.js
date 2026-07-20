const Utils = {
    formatCurrency(amount) {
        return '£' + Number(amount || 0).toFixed(2);
    },

    formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    formatTime(date) {
        const d = new Date(date);
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    },

    formatDateTime(date) {
        return this.formatDate(date) + ' ' + this.formatTime(date);
    },

    today() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    toast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    },

    showModal(title, bodyHTML, footerHTML = '') {
        document.getElementById('modal-title').textContent = title;
        const body = document.getElementById('modal-body');
        body.innerHTML = bodyHTML;
        if (footerHTML) {
            let footer = body.querySelector('.modal-footer');
            if (!footer) {
                footer = document.createElement('div');
                footer.className = 'modal-footer';
                footer.style.cssText = 'padding-top:16px;border-top:1px solid var(--border-subtle);margin-top:16px;';
                body.appendChild(footer);
            }
            footer.innerHTML = footerHTML;
        }
        document.getElementById('modal-overlay').style.display = 'flex';
    },

    hideModal() {
        document.getElementById('modal-overlay').style.display = 'none';
    },

    async getSetting(key, defaultValue) {
        const setting = await db.settings.get(key);
        return setting ? setting.value : defaultValue;
    },

    async setSetting(key, value) {
        await db.settings.put({ key, value });
    },

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    getWeekStart() {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    getMonthStart() {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    getYearStart() {
        const now = new Date();
        const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        return new Date(year, 3, 6);
    },

    async encryptData(data, key) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(key), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const derivedKey = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, enc.encode(JSON.stringify(data)));
        return { salt: Array.from(salt), iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
    },

    async decryptData(encObj, key) {
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(key), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
        const derivedKey = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: new Uint8Array(encObj.salt), iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(encObj.iv) }, derivedKey, new Uint8Array(encObj.data));
        return JSON.parse(dec.decode(decrypted));
    }
};
