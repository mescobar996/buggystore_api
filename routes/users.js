const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDb, saveDb, nextId } = require('../db');

const JWT_SECRET = 'buggystore_secret_2024';

// POST /api/users/register
// BUG-001: No valida formato de email (acepta "usuario" sin @)
// BUG-002: No valida longitud mínima de password
// BUG-003: Guarda password en texto plano
// BUG-004: Devuelve 200 en vez de 201
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nombre, email y password son requeridos' });

  // BUG-001: falta if (!email.includes('@')) return res.status(400)...
  // BUG-002: falta if (password.length < 8) return res.status(400)...

  const db = getDb();
  if (db.users.find(u => u.email === email))
    return res.status(400).json({ error: 'Email ya registrado' });

  const id = nextId(db, 'users');
  // BUG-003: password sin hash
  db.users.push({ id, name, email, password, role: 'customer', created_at: new Date().toISOString() });
  saveDb(db);

  // BUG-004: debería ser 201
  return res.status(200).json({ message: 'Usuario registrado exitosamente' });
});

// POST /api/users/login
// BUG-005: Credenciales inválidas devuelven 200 en vez de 401
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y password son requeridos' });

  const db = getDb();
  // BUG-003 consecuencia: compara en texto plano
  const user = db.users.find(u => u.email === email && u.password === password);

  if (!user) {
    // BUG-005: debería ser 401
    return res.status(200).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  return res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// GET /api/users/:id
// BUG-006: Usuario no encontrado devuelve 200 con {} en vez de 404
router.get('/:id', (req, res) => {
  const db = getDb();
  const user = db.users.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    // BUG-006: debería ser 404
    return res.status(200).json({});
  }
  const { password, ...safe } = user;
  return res.status(200).json(safe);
});

// GET /api/users
router.get('/', (req, res) => {
  const db = getDb();
  return res.status(200).json(db.users.map(({ password, ...u }) => u));
});

module.exports = router;
