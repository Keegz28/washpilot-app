const db = new Dexie('WashPilotDB');

db.version(1).stores({
    settings: 'key',
    customers: 'id, name, phone, createdAt',
    bookings: 'id, customerId, date, status, priority, createdAt',
    income: 'id, bookingId, date, paymentMethod, amount',
    expenses: 'id, date, category, amount, description',
    equipment: 'id, name, category, quantity, lowStockAt',
    savingsGoals: 'id, name, createdAt',
    invoices: 'id, bookingId, customerId, createdAt',
    sops: 'id, title, createdAt, updatedAt'
});
