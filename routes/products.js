const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db');

// GET /api/products — lista todos los productos
router.get('/', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`SELECT * FROM products`);
  if (!result.length) return res.status(200).json([]);
  const products = result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((col, i) => [col, row[i]]))
  );
  return res.status(200).json(products);
});

// ============================================================
// GET /api/products/:id
// BUG #7: Producto no encontrado devuelve 200 con null
//         en lugar de 404
// ============================================================
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`SELECT * FROM products WHERE id = ${req.params.id}`);

  if (!result.length || !result[0].values.length) {
    // BUG #7: Debería ser 404
    return res.status(200).json(null);
  }

  const product = Object.fromEntries(result[0].columns.map((col, i) => [col, result[0].values[0][i]]));
  return res.status(200).json(product);
});

// ============================================================
// POST /api/products — crear producto
// BUG #8: Acepta precio negativo (no hay validación price > 0)
// BUG #9: Acepta stock null / negativo
// BUG #10: Devuelve 200 en lugar de 201
// ============================================================
router.post('/', async (req, res) => {
  const { name, description, price, stock, category } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Nombre y precio son requeridos' });
  }

  // BUG #8: Falta: if (price < 0) return res.status(400)...
  // BUG #9: Falta: if (stock < 0) return res.status(400)...

  const db = await getDb();
  db.run(
    `INSERT INTO products (name, description, price, stock, category)
     VALUES ('${name}', '${description || ''}', ${price}, ${stock ?? 'NULL'}, '${category || ''}')`
  );
  saveDb();

  // BUG #10: Debería ser 201
  return res.status(200).json({ message: 'Producto creado exitosamente' });
});

// ============================================================
// PUT /api/products/:id — actualizar producto
// BUG #11: Si el producto no existe, igual responde 200 OK
// ============================================================
router.put('/:id', async (req, res) => {
  const { name, description, price, stock, category } = req.body;
  const db = await getDb();

  // BUG #11: No verifica si el producto existe antes de actualizar
  db.run(
    `UPDATE products SET
      name = '${name}',
      description = '${description || ''}',
      price = ${price},
      stock = ${stock ?? 'NULL'},
      category = '${category || ''}'
     WHERE id = ${req.params.id}`
  );
  saveDb();

  return res.status(200).json({ message: 'Producto actualizado' });
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  db.run(`DELETE FROM products WHERE id = ${req.params.id}`);
  saveDb();
  return res.status(200).json({ message: 'Producto eliminado' });
});

module.exports = router;
