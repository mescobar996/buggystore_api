const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db');

// GET /api/orders — todas las órdenes
router.get('/', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`
    SELECT o.id, o.user_id, u.name as user_name, o.total, o.status, o.created_at
    FROM orders o
    JOIN users u ON o.user_id = u.id
  `);
  if (!result.length) return res.status(200).json([]);
  const orders = result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((col, i) => [col, row[i]]))
  );
  return res.status(200).json(orders);
});

// GET /api/orders/:id — detalle de una orden con items
router.get('/:id', async (req, res) => {
  const db = await getDb();

  const orderResult = db.exec(`SELECT * FROM orders WHERE id = ${req.params.id}`);
  if (!orderResult.length || !orderResult[0].values.length) {
    return res.status(404).json({ error: 'Orden no encontrada' });
  }

  const order = Object.fromEntries(orderResult[0].columns.map((col, i) => [col, orderResult[0].values[0][i]]));

  const itemsResult = db.exec(`
    SELECT oi.id, oi.product_id, p.name as product_name, oi.quantity, oi.unit_price,
           (oi.quantity * oi.unit_price) as subtotal
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ${req.params.id}
  `);

  const items = itemsResult.length
    ? itemsResult[0].values.map(row =>
        Object.fromEntries(itemsResult[0].columns.map((col, i) => [col, row[i]]))
      )
    : [];

  return res.status(200).json({ ...order, items });
});

// ============================================================
// POST /api/orders — crear orden
// BUG #12: El total se calcula sumando solo unit_price, ignora quantity
//          Ej: 2x $25.99 → debería ser $51.98 pero guarda $25.99
// BUG #13: No descuenta el stock de los productos
// BUG #14: No valida si hay stock suficiente antes de crear la orden
// BUG #15: Devuelve 200 en lugar de 201
// ============================================================
router.post('/', async (req, res) => {
  const { user_id, items } = req.body;

  if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'user_id e items son requeridos' });
  }

  const db = await getDb();

  // Verificar que el usuario existe
  const userCheck = db.exec(`SELECT id FROM users WHERE id = ${user_id}`);
  if (!userCheck.length || !userCheck[0].values.length) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  // BUG #12: Calcula total sumando solo unit_price (sin multiplicar por quantity)
  let total = 0;
  const enrichedItems = [];

  for (const item of items) {
    const productResult = db.exec(`SELECT id, price, stock FROM products WHERE id = ${item.product_id}`);
    if (!productResult.length || !productResult[0].values.length) {
      return res.status(404).json({ error: `Producto ${item.product_id} no encontrado` });
    }

    const [pid, price, stock] = productResult[0].values[0];

    // BUG #14: Falta validación: if (stock < item.quantity) return 400...

    // BUG #12: Debería ser: total += price * item.quantity
    total += price;

    enrichedItems.push({ product_id: pid, quantity: item.quantity, unit_price: price });
  }

  // Crear la orden
  db.run(`INSERT INTO orders (user_id, total, status) VALUES (${user_id}, ${total}, 'pending')`);

  const orderResult = db.exec(`SELECT last_insert_rowid() as id`);
  const orderId = orderResult[0].values[0][0];

  // Insertar items
  for (const item of enrichedItems) {
    db.run(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       VALUES (${orderId}, ${item.product_id}, ${item.quantity}, ${item.unit_price})`
    );

    // BUG #13: Falta: db.run(`UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.product_id}`)
  }

  saveDb();

  // BUG #15: Debería ser 201
  return res.status(200).json({ message: 'Orden creada', order_id: orderId, total });
});

// ============================================================
// PATCH /api/orders/:id/status — cambiar estado de orden
// BUG #16: No valida que el estado sea uno de los permitidos
//          (acepta cualquier string: "banana", "enviado123", etc.)
// ============================================================
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status es requerido' });
  }

  // BUG #16: Falta validar: const VALID_STATUS = ['pending','processing','shipped','delivered','cancelled']
  const db = await getDb();
  db.run(`UPDATE orders SET status = '${status}' WHERE id = ${req.params.id}`);
  saveDb();

  return res.status(200).json({ message: 'Estado actualizado' });
});

module.exports = router;
