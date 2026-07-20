const Auth = {
    pin: '',
    confirmPin: '',
    setupStep: 1,
    lastActivity: Date.now(),
    timeoutId: null,
    timeoutMinutes: 10,

    async init() {
        this.timeoutMinutes = await Utils.getSetting('lockTimeout', 10);
        const pinHash = await Utils.getSetting('pinHash', null);
        if (!pinHash) {
            document.getElementById('lock-screen').style.display = 'none';
            document.getElementById('setup-screen').style.display = 'flex';
            this.initSetupPad();
        } else {
            document.getElementById('setup-screen').style.display = 'none';
            document.getElementById('lock-screen').style.display = 'flex';
            this.initLockPad();
        }
        this.startActivityMonitor();
    },

    initLockPad() {
        document.getElementById('pin-pad').addEventListener('click', e => {
            const key = e.target.closest('.pin-key');
            if (!key) return;
            const val = key.dataset.key;
            if (val === 'del') {
                this.pin = this.pin.slice(0, -1);
            } else if (val && this.pin.length < 4) {
                this.pin += val;
            }
            this.updateDots('pin-dots', this.pin.length);
            if (this.pin.length === 4) this.verifyPin();
        });
    },

    initSetupPad() {
        document.getElementById('setup-pad').addEventListener('click', e => {
            const key = e.target.closest('.pin-key');
            if (!key) return;
            const val = key.dataset.key;
            if (val === 'del') {
                this.confirmPin = this.confirmPin.slice(0, -1);
            } else if (val && this.confirmPin.length < 4) {
                this.confirmPin += val;
            }
            this.updateDots('setup-dots', this.confirmPin.length);
            if (this.confirmPin.length === 4) this.handleSetupStep();
        });
    },

    updateDots(dotId, count) {
        const dots = document.querySelectorAll(`#${dotId} .pin-dot`);
        dots.forEach((dot, i) => dot.classList.toggle('filled', i < count));
    },

    async handleSetupStep() {
        if (this.setupStep === 1) {
            this.pin = this.confirmPin;
            this.confirmPin = '';
            this.setupStep = 2;
            document.getElementById('setup-instruction').textContent = 'Confirm your PIN';
            this.updateDots('setup-dots', 0);
        } else {
            if (this.confirmPin === this.pin) {
                const hash = await this.hashPin(this.pin);
                await Utils.setSetting('pinHash', hash);
                document.getElementById('setup-screen').style.display = 'none';
                document.getElementById('app').style.display = 'flex';
                App.init();
            } else {
                document.getElementById('setup-error').textContent = 'PINs do not match. Try again.';
                this.confirmPin = '';
                this.setupStep = 1;
                document.getElementById('setup-instruction').textContent = 'Enter your PIN';
                this.updateDots('setup-dots', 0);
                setTimeout(() => document.getElementById('setup-error').textContent = '', 2000);
            }
        }
    },

    async verifyPin() {
        const hash = await this.hashPin(this.pin);
        const stored = await Utils.getSetting('pinHash', null);
        if (hash === stored) {
            document.getElementById('lock-screen').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            this.pin = '';
            this.updateDots('pin-dots', 0);
            this.lastActivity = Date.now();
            App.init();
        } else {
            document.getElementById('pin-error').textContent = 'Incorrect PIN';
            this.pin = '';
            this.updateDots('pin-dots', 0);
            setTimeout(() => document.getElementById('pin-error').textContent = '', 2000);
        }
    },

    async hashPin(pin) {
        const enc = new TextEncoder();
        const hash = await crypto.subtle.digest('SHA-256', enc.encode(pin + 'washpilot_salt'));
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    lock() {
        document.getElementById('app').style.display = 'none';
        document.getElementById('lock-screen').style.display = 'flex';
        this.pin = '';
        this.updateDots('pin-dots', 0);
    },

    startActivityMonitor() {
        ['click', 'touchstart', 'keydown', 'scroll'].forEach(evt => {
            document.addEventListener(evt, () => { this.lastActivity = Date.now(); }, { passive: true });
        });
        setInterval(() => {
            const elapsed = (Date.now() - this.lastActivity) / 60000;
            if (elapsed >= this.timeoutMinutes && document.getElementById('app').style.display !== 'none') {
                this.lock();
            }
        }, 30000);
    }
};
