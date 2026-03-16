const express = require('express');
const router = express.Router();
const { getDb, saveDb, nextId } = require('../db');

// GET /api/products
router.get('/', (req, res) => {
  const db = getDb();
  return res.status(200).json(db.products);
});

// GET /api/products/:id
// BUG-007: No encontrado devuelve 200 con null en vez de 404
router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    // BUG-007: debería ser 404
    return res.status(200).json(null);
  }
  return res.status(200).json(product);
});

// POST /api/products
// BUG-008: Acepta precio negativo
// BUG-009: Acepta stock negativo/null
// BUG-010: Devuelve 200 en vez de 201
router.post('/', (req, res) => {
  const { name, description, price, stock, category } = req.body;
  if (!name || price === undefined)
    return res.status(400).json({ error: 'Nombre y precio son requeridos' });

  // BUG-008: falta if (price < 0) return res.status(400)...
  // BUG-009: falta if (stock < 0) return res.status(400)...

  const db = getDb();
  const id = nextId(db, 'products');
  db.products.push({ id, name, description: description || '', price, stock: stock ?? null, category: category || '', created_at: new Date().toISOString() });
  saveDb(db);

  // BUG-010: debería ser 201
  return res.status(200).json({ message: 'Producto creado exitosamente' });
});

// PUT /api/products/:id
// BUG-011: Si no existe devuelve 200 igual
router.put('/:id', (req, res) => {
  const { name, description, price, stock, category } = req.body;
  const db = getDb();
  const idx = db.products.findIndex(p => p.id === parseInt(req.params.id));

  // BUG-011: debería verificar y devolver 404 si no existe
  if (idx !== -1) {
    db.products[idx] = { ...db.products[idx], name, description: description || '', price, stock: stock ?? null, category: category || '' };
    saveDb(db);
  }

  return res.status(200).json({ message: 'Producto actualizado' });
});

// DELETE /api/products/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.products = db.products.filter(p => p.id !== parseInt(req.params.id));
  saveDb(db);
  return res.status(200).json({ message: 'Producto eliminado' });
});

module.exports = router;
