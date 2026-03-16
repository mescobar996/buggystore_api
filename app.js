const express = require('express');
const app = express();

app.use(express.json());

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', app: 'BuggyStore API', version: '1.0.0' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`BuggyStore API corriendo en http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: El puerto ${PORT} ya está en uso.`);
    console.error(`   Cerrá el proceso que lo ocupa y volvé a intentar.`);
    console.error(`   En Git Bash: netstat -ano | grep ${PORT}  → luego taskkill /PID <numero> /F`);
  } else if (err.code === 'EACCES') {
    console.error(`\n❌ ERROR: Sin permisos para abrir el puerto ${PORT}.`);
    console.error(`   Intentá con otro puerto: PORT=8081 node app.js`);
  } else {
    console.error(`\n❌ ERROR al iniciar el servidor:`, err.message);
  }
  process.exit(1);
});

module.exports = app;
