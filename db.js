const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'buggystore_db.json');

const defaultDb = {
  users: [],
  products: [
    { id: 1, name: 'Laptop Pro 15', description: 'Laptop de alto rendimiento', price: 1200.00, stock: 10, category: 'electronics', created_at: new Date().toISOString() },
    { id: 2, name: 'Mouse Inalámbrico', description: 'Mouse ergonómico inalámbrico', price: 25.99, stock: 50, category: 'accessories', created_at: new Date().toISOString() },
    { id: 3, name: 'Teclado Mecánico', description: 'Teclado con switches azules', price: 89.99, stock: 30, category: 'accessories', created_at: new Date().toISOString() },
    { id: 4, name: 'Monitor 27"', description: 'Monitor Full HD', price: 350.00, stock: 15, category: 'electronics', created_at: new Date().toISOString() },
    { id: 5, name: 'Auriculares Bluetooth', description: 'Auriculares con cancelación de ruido', price: 149.99, stock: 20, category: 'accessories', created_at: new Date().toISOString() }
  ],
  orders: [],
  order_items: [],
  _counters: { users: 0, products: 5, orders: 0, order_items: 0 }
};

function getDb() {
  if (fs.existsSync(DB_PATH)) {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  }
  saveDb(defaultDb);
  return JSON.parse(JSON.stringify(defaultDb));
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(db, table) {
  db._counters[table] = (db._counters[table] || 0) + 1;
  return db._counters[table];
}

module.exports = { getDb, saveDb, nextId };
