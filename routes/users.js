const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDb, saveDb } = require('../db');

const JWT_SECRET = 'buggystore_secret_2024';

// ============================================================
// POST /api/users/register
// BUG #1: No valida formato de email (acepta "usuario" sin @)
// BUG #2: No valida longitud mínima de password
// BUG #3: Guarda password en texto plano (sin hash)
// ============================================================
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y password son requeridos' });
  }

  // BUG #1: Falta validación: if (!email.includes('@')) ...
  // BUG #2: Falta validación: if (password.length < 8) ...

  const db = await getDb();

  const existing = db.exec(`SELECT id FROM users WHERE email = '${email}'`);
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(400).json({ error: 'Email ya registrado' });
  }

  // BUG #3: Password sin hashear
  db.run(
    `INSERT INTO users (name, email, password) VALUES ('${name}', '${email}', '${password}')`
  );
  saveDb();

  // BUG #4: Devuelve 200 en vez de 201 para creación
  return res.status(200).json({ message: 'Usuario registrado exitosamente' });
});

// ============================================================
// POST /api/users/login
// BUG #5: Si el usuario no existe, devuelve 200 con error en body
//         (debería ser 401 o 404)
// ============================================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }

  const db = await getDb();

  // BUG #3 consecuencia: compara password en texto plano
  const result = db.exec(
    `SELECT id, name, email, role FROM users WHERE email = '${email}' AND password = '${password}'`
  );

  if (!result.length || !result[0].values.length) {
    // BUG #5: Status 200 en credenciales inválidas
    return res.status(200).json({ error: 'Credenciales inválidas' });
  }

  const [id, name, userEmail, role] = result[0].values[0];
  const token = jwt.sign({ id, email: userEmail, role }, JWT_SECRET, { expiresIn: '24h' });

  return res.status(200).json({ token, user: { id, name, email: userEmail, role } });
});

// ============================================================
// GET /api/users/:id
// BUG #6: Si el usuario no existe, devuelve 200 con body vacío
//         en lugar de 404
// ============================================================
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`SELECT id, name, email, role, created_at FROM users WHERE id = ${req.params.id}`);

  if (!result.length || !result[0].values.length) {
    // BUG #6: Debería ser 404
    return res.status(200).json({});
  }

  const [id, name, email, role, created_at] = result[0].values[0];
  return res.status(200).json({ id, name, email, role, created_at });
});

// GET /api/users — lista todos (admin only, pero sin validación de rol)
router.get('/', async (req, res) => {
  const db = await getDb();
  const result = db.exec(`SELECT id, name, email, role, created_at FROM users`);
  if (!result.length) return res.status(200).json([]);
  const [cols, ...rows] = [result[0].columns, ...result[0].values];
  const users = result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((col, i) => [col, row[i]]))
  );
  return res.status(200).json(users);
});

module.exports = router;
