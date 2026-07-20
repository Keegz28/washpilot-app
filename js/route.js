const Route = {
    map: null,
    markers: [],

    async render() {
        const view = document.getElementById('view-route');
        const today = Utils.today();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const bookings = await db.bookings.where('date').between(today, tomorrow, true, false)
            .and(b => b.status !== 'cancelled' && b.status !== 'done' && b.address)
            .toArray();

        view.innerHTML = `
            <div class="map-container">
                <div id="route-map"></div>
            </div>
            <div class="section-header">
                <span class="section-title">Today's Route (${bookings.length} stops)</span>
            </div>
            <div class="card" id="route-stops">
                ${bookings.length === 0
                    ? '<div class="empty-state"><div class="empty-state-icon">🗺️</div><div class="empty-state-text">No jobs with addresses today</div></div>'
                    : bookings.sort((a, b) => {
                        if (a.priority && !b.priority) return -1;
                        if (!a.priority && b.priority) return 1;
                        return new Date(a.date) - new Date(b.date);
                    }).map((b, i) => `
                        <div class="list-item" data-idx="${i}">
                            <div class="list-icon" style="background:var(--accent);color:white;border-radius:50%;font-weight:700;font-size:14px;">${i + 1}</div>
                            <div class="list-content">
                                <div class="list-title">${Utils.escapeHTML(b.customerName || 'Unknown')}</div>
                                <div class="list-subtitle">${Utils.escapeHTML(b.address)} ${b.priority ? '<span class="badge badge-priority">Priority</span>' : ''}</div>
                            </div>
                            <div class="list-right">
                                <div style="font-size:13px;color:var(--text-secondary);">${Utils.formatTime(b.date)}</div>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            ${bookings.length > 0 ? `
                <button class="btn btn-primary" id="open-maps" style="margin-top:8px;">Open Walking Route in Maps</button>
            ` : ''}
        `;

        if (bookings.length > 0) {
            this.initMap(bookings);
            document.getElementById('open-maps').addEventListener('click', () => this.openInMaps(bookings));
        }
    },

    initMap(bookings) {
        setTimeout(() => {
            const mapEl = document.getElementById('route-map');
            if (!mapEl) return;

            if (this.map) {
                this.map.remove();
                this.map = null;
            }

            this.map = L.map('route-map').setView([53.35, -1.47], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(this.map);

            this.markers = [];
            const bounds = [];

            bookings.forEach((b, i) => {
                this.geocode(b.address).then(coords => {
                    if (!coords) return;
                    const marker = L.marker(coords)
                        .addTo(this.map)
                        .bindPopup(`<strong>${i + 1}. ${Utils.escapeHTML(b.customerName || '')}</strong><br>${Utils.escapeHTML(b.address)}`);
                    this.markers.push(marker);
                    bounds.push(coords);

                    if (bounds.length === bookings.length) {
                        this.map.fitBounds(bounds, { padding: [30, 30] });
                        if (bounds.length > 1) {
                            L.polyline(bounds, { color: '#3b82f6', weight: 3, dashArray: '8, 8' }).addTo(this.map);
                        }
                    }
                });
            });
        }, 100);
    },

    async geocode(address) {
        try {
            const fullAddress = address.toLowerCase().includes('sheffield') ? address : address + ', Sheffield, UK';
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`, {
                headers: { 'User-Agent': 'WashPilot/1.0' }
            });
            const data = await res.json();
            if (data.length > 0) {
                return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            }
        } catch (e) {}
        return null;
    },

    openInMaps(bookings) {
        if (bookings.length < 2) {
            this.geocode(bookings[0].address).then(coords => {
                if (coords) {
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}&travelmode=walking`, '_blank');
                }
            });
            return;
        }

        const sorted = bookings.sort((a, b) => {
            if (a.priority && !b.priority) return -1;
            if (!a.priority && b.priority) return 1;
            return new Date(a.date) - new Date(b.date);
        });

        Promise.all(sorted.map(b => this.geocode(b.address))).then(coords => {
            const valid = coords.filter(c => c);
            if (valid.length < 2) return Utils.toast('Could not geocode all addresses');
            const waypoints = valid.slice(1, -1).map(c => `${c[0]},${c[1]}`).join('|');
            const origin = `${valid[0][0]},${valid[0][1]}`;
            const dest = `${valid[valid.length - 1][0]},${valid[valid.length - 1][1]}`;
            const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${waypoints}&travelmode=walking`;
            window.open(url, '_blank');
        });
    }
};
