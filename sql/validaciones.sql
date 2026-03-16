-- ============================================================
-- BuggyStore API — Queries SQL de Validación QA
-- Diplomatura Control de Calidad de Software - UNTREF
-- ============================================================
-- Estas queries se ejecutan directamente sobre buggystore.db
-- Herramienta recomendada: DB Browser for SQLite
-- ============================================================


-- ============================================================
-- MÓDULO USERS
-- ============================================================

-- VAL-001: Detectar usuarios con email sin formato válido (BUG-001)
-- Esperado: 0 registros
-- Si encuentra registros → BUG-001 confirmado
SELECT id, name, email
FROM users
WHERE email NOT LIKE '%@%.%';

-- VAL-002: Detectar passwords en texto plano (BUG-003)
-- Los hashes bcrypt empiezan con '$2b$' o '$2a$'
-- Si password NO empieza con '$2', está en texto plano → BUG-003 confirmado
SELECT id, name, email, password
FROM users
WHERE password NOT LIKE '$2%';

-- VAL-003: Detectar passwords muy cortos (BUG-002)
-- Esperado: 0 registros con password < 8 caracteres
SELECT id, name, email, LENGTH(password) as pwd_length
FROM users
WHERE LENGTH(password) < 8;

-- VAL-004: Usuarios duplicados por email
-- Esperado: 0 registros (cada email debe ser único)
SELECT email, COUNT(*) as cantidad
FROM users
GROUP BY email
HAVING COUNT(*) > 1;


-- ============================================================
-- MÓDULO PRODUCTS
-- ============================================================

-- VAL-005: Detectar productos con precio negativo o cero (BUG-008)
-- Esperado: 0 registros
SELECT id, name, price
FROM products
WHERE price <= 0;

-- VAL-006: Detectar productos con stock negativo o null (BUG-009)
-- Esperado: 0 registros
SELECT id, name, stock
FROM products
WHERE stock < 0 OR stock IS NULL;

-- VAL-007: Resumen de estado del catálogo
SELECT
  COUNT(*) as total_productos,
  SUM(CASE WHEN price < 0 THEN 1 ELSE 0 END) as precio_negativo,
  SUM(CASE WHEN stock IS NULL THEN 1 ELSE 0 END) as stock_nulo,
  SUM(CASE WHEN stock < 0 THEN 1 ELSE 0 END) as stock_negativo,
  SUM(CASE WHEN price = 0 THEN 1 ELSE 0 END) as precio_cero
FROM products;


-- ============================================================
-- MÓDULO ORDERS — BUG-012: Total mal calculado
-- ============================================================

-- VAL-008: Comparar total guardado vs total real calculado
-- Si total_real != total_guardado → BUG-012 confirmado
SELECT
  o.id as order_id,
  o.total as total_guardado,
  SUM(oi.quantity * oi.unit_price) as total_real,
  ROUND(SUM(oi.quantity * oi.unit_price) - o.total, 2) as diferencia
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id
HAVING ABS(diferencia) > 0.01;

-- VAL-009: Detalle de items de cada orden (para análisis manual)
SELECT
  o.id as order_id,
  o.total as total_en_orden,
  oi.product_id,
  p.name as producto,
  oi.quantity,
  oi.unit_price,
  (oi.quantity * oi.unit_price) as subtotal_correcto
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
ORDER BY o.id, oi.id;


-- ============================================================
-- MÓDULO ORDERS — BUG-013: Stock no se descuenta
-- ============================================================

-- VAL-010: Calcular el stock que DEBERÍA tener cada producto
-- según las órdenes registradas, y comparar con el stock actual
-- Si stock_actual != stock_esperado → BUG-013 confirmado
SELECT
  p.id,
  p.name,
  p.stock as stock_actual,
  COALESCE(SUM(oi.quantity), 0) as unidades_vendidas,
  p.stock + COALESCE(SUM(oi.quantity), 0) as stock_original_estimado
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id;

-- VAL-011: Detectar órdenes donde se vendió más de lo disponible (BUG-014)
-- Si quantity vendida > stock actual → no se validó disponibilidad
SELECT
  oi.order_id,
  oi.product_id,
  p.name as producto,
  p.stock as stock_disponible,
  oi.quantity as quantity_ordenada,
  CASE WHEN oi.quantity > p.stock THEN 'SOBREVENTA' ELSE 'OK' END as estado
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE oi.quantity > p.stock;


-- ============================================================
-- MÓDULO ORDERS — BUG-016: Status inválidos
-- ============================================================

-- VAL-012: Detectar órdenes con status fuera de los valores permitidos
-- Valores válidos: pending, processing, shipped, delivered, cancelled
SELECT id, status
FROM orders
WHERE status NOT IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled');


-- ============================================================
-- VALIDACIONES CRUZADAS GENERALES
-- ============================================================

-- VAL-013: Órdenes huérfanas (user_id no existe en users)
SELECT o.id, o.user_id
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE u.id IS NULL;

-- VAL-014: Order items con producto inexistente
SELECT oi.id, oi.order_id, oi.product_id
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE p.id IS NULL;

-- VAL-015: Resumen ejecutivo del estado general de la BD
SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE email NOT LIKE '%@%.%') as emails_invalidos,
  (SELECT COUNT(*) FROM users WHERE password NOT LIKE '$2%') as passwords_sin_hash,
  (SELECT COUNT(*) FROM products) as total_productos,
  (SELECT COUNT(*) FROM products WHERE price < 0) as productos_precio_negativo,
  (SELECT COUNT(*) FROM products WHERE stock < 0 OR stock IS NULL) as productos_stock_invalido,
  (SELECT COUNT(*) FROM orders) as total_ordenes,
  (SELECT COUNT(*) FROM orders WHERE status NOT IN ('pending','processing','shipped','delivered','cancelled')) as ordenes_status_invalido;
