const express = require('express');
const router = express.Router();
const { getDb, saveDb, nextId } = require('../db');

// GET /api/orders
router.get('/', (req, res) => {
  const db = getDb();
  const orders = db.orders.map(o => {
    const user = db.users.find(u => u.id === o.user_id);
    return { ...o, user_name: user ? user.name : 'unknown' };
  });
  return res.status(200).json(orders);
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const order = db.orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

  const items = db.order_items
    .filter(i => i.order_id === order.id)
    .map(i => {
      const product = db.products.find(p => p.id === i.product_id);
      return { ...i, product_name: product ? product.name : 'unknown', subtotal: i.quantity * i.unit_price };
    });

  return res.status(200).json({ ...order, items });
});

// POST /api/orders
// BUG-012: Total ignora quantity (suma solo unit_price)
// BUG-013: No descuenta stock
// BUG-014: No valida stock suficiente
// BUG-015: Devuelve 200 en vez de 201
router.post('/', (req, res) => {
  const { user_id, items } = req.body;
  if (!user_id || !items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'user_id e items son requeridos' });

  const db = getDb();
  const user = db.users.find(u => u.id === parseInt(user_id));
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  let total = 0;
  const enrichedItems = [];

  for (const item of items) {
    const product = db.products.find(p => p.id === parseInt(item.product_id));
    if (!product) return res.status(404).json({ error: `Producto ${item.product_id} no encontrado` });

    // BUG-014: falta if (product.stock < item.quantity) return res.status(400)...

    // BUG-012: debería ser total += product.price * item.quantity
    total += product.price;

    enrichedItems.push({ product_id: product.id, quantity: item.quantity, unit_price: product.price });
  }

  const orderId = nextId(db, 'orders');
  db.orders.push({ id: orderId, user_id: parseInt(user_id), total, status: 'pending', created_at: new Date().toISOString() });

  for (const item of enrichedItems) {
    const itemId = nextId(db, 'order_items');
    db.order_items.push({ id: itemId, order_id: orderId, ...item });
    // BUG-013: falta actualizar stock del producto
  }

  saveDb(db);

  // BUG-015: debería ser 201
  return res.status(200).json({ message: 'Orden creada', order_id: orderId, total });
});

// PATCH /api/orders/:id/status
// BUG-016: Acepta cualquier string como status
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status es requerido' });

  // BUG-016: falta validar contra ['pending','processing','shipped','delivered','cancelled']

  const db = getDb();
  const order = db.orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

  order.status = status;
  saveDb(db);

  return res.status(200).json({ message: 'Estado actualizado' });
});

module.exports = router;
