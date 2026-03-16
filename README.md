# 🛒 BuggyStore API

> API REST de e-commerce con bugs intencionales para práctica de QA Testing.

---

## Descripción

BuggyStore es una API de e-commerce construida con **Node.js + Express + SQLite** que contiene **16 bugs intencionales** distribuidos en sus módulos. Fue diseñada como proyecto de portfolio QA para practicar:

- Diseño de Test Cases (caja negra)
- Bug Reporting completo
- API Testing con Postman
- Validación con SQL

---

## ⚙️ Instalación y ejecución

```bash
# 1. Clonar o descargar el proyecto
cd BuggyStore_API

# 2. Instalar dependencias
npm install

# 3. Ejecutar la API
node app.js

# La API corre en http://localhost:8080
```

> **⚠️ Nota para usuarios Windows:** Si al ejecutar `node app.js` aparece un error de puerto,
> probablemente el puerto 8080 ya está en uso. Podés usar un puerto alternativo:
> ```bash
> PORT=8081 node app.js
> ```

---

## 🧪 Guía de pruebas paso a paso (para QA juniors)

### Requisitos previos
- Tener Node.js instalado ([descargar acá](https://nodejs.org))
- Tener Postman instalado **o** Git Bash / terminal con `curl`

---

### Paso 1 — Levantar el servidor

Abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
node app.js
```

Deberías ver:
```
BuggyStore API corriendo en http://localhost:8080
Health check: http://localhost:8080/health
```

> 🔴 **La terminal tiene que quedar abierta** mientras estás probando. El servidor vive en esa ventana.
> Abrí una segunda terminal para ejecutar los comandos de prueba.

---

### Paso 2 — Verificar que la API responde

En la segunda terminal:

```bash
curl http://localhost:8080/health
```

Respuesta esperada:
```json
{"status":"ok","app":"BuggyStore API","version":"1.0.0"}
```

✅ Si ves eso, la API está funcionando.

---

### Paso 3 — Probar los endpoints (con curl)

#### Registrar usuario
```bash
curl -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Lopez","email":"ana@email.com","password":"12345678"}'
```

#### Login
```bash
curl -X POST http://localhost:8080/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@email.com","password":"12345678"}'
```

#### Listar productos
```bash
curl http://localhost:8080/api/products
```

#### Crear una orden
```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"items":[{"product_id":1,"quantity":2},{"product_id":2,"quantity":3}]}'
```

---

### Paso 4 — Probar los bugs intencionales

Intentá reproducir cada bug del catálogo (sección más abajo). Para cada uno:

1. Ejecutá el request que debería disparar el bug
2. Observá el comportamiento real de la API
3. Compará con el comportamiento esperado
4. Documentá el hallazgo en tu bug report

**Ejemplo — BUG-001:**
```bash
# Debería fallar, pero NO lo hace (eso es el bug):
curl -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"SINAARROBA","password":"12345678"}'
```

---

### Paso 5 — Resetear la base de datos

La API guarda datos en `buggystore_db.json`. Si querés empezar desde cero:

```bash
# Detené el servidor (Ctrl+C en la primera terminal)
# Borrá el archivo de base de datos:
rm buggystore_db.json

# Reiniciá el servidor:
node app.js
```

---

## Endpoints disponibles

### Users
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/users/register` | Registrar usuario |
| POST | `/api/users/login` | Login |
| GET | `/api/users` | Listar usuarios |
| GET | `/api/users/:id` | Obtener usuario por ID |

### Products
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/products` | Listar productos |
| GET | `/api/products/:id` | Obtener producto por ID |
| POST | `/api/products` | Crear producto |
| PUT | `/api/products/:id` | Actualizar producto |
| DELETE | `/api/products/:id` | Eliminar producto |

### Orders
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/orders` | Listar órdenes |
| GET | `/api/orders/:id` | Detalle de orden |
| POST | `/api/orders` | Crear orden |
| PATCH | `/api/orders/:id/status` | Cambiar estado |

---

## Bugs intencionales — Catálogo oficial

> ⚠️ SPOILER: Esta sección documenta todos los bugs.  
> Si querés practicar descubriéndolos, no leas esta sección todavía.

---

### Módulo Users

| ID | Endpoint | Bug | Comportamiento actual | Comportamiento esperado |
|----|----------|-----|----------------------|------------------------|
| BUG-001 | POST /register | Sin validación de formato email | Acepta `"noesunemail"` sin @ | Devolver 400 si email no contiene @ y dominio válido |
| BUG-002 | POST /register | Sin validación de longitud de password | Acepta `"1"` como password válido | Mínimo 8 caracteres, devolver 400 si no cumple |
| BUG-003 | POST /register | Password guardado en texto plano | Password visible en BD sin hash | Debe hashearse con bcrypt o similar |
| BUG-004 | POST /register | Status code incorrecto en creación | Devuelve `200 OK` | Debe devolver `201 Created` |
| BUG-005 | POST /login | Status code incorrecto en error | Credenciales inválidas devuelven `200 OK` con error en body | Debe devolver `401 Unauthorized` |
| BUG-006 | GET /users/:id | Usuario no encontrado devuelve 200 | Devuelve `200 OK` con `{}` vacío | Debe devolver `404 Not Found` |

---

### Módulo Products

| ID | Endpoint | Bug | Comportamiento actual | Comportamiento esperado |
|----|----------|-----|----------------------|------------------------|
| BUG-007 | GET /products/:id | Producto no encontrado devuelve 200 | Devuelve `200 OK` con `null` | Debe devolver `404 Not Found` |
| BUG-008 | POST /products | Acepta precio negativo | `price: -50` se crea sin error | Validar `price > 0`, devolver 400 si no |
| BUG-009 | POST /products | Acepta stock negativo/null | `stock: -5` y `stock: null` se aceptan | Validar `stock >= 0`, devolver 400 si negativo |
| BUG-010 | POST /products | Status code incorrecto | Devuelve `200 OK` | Debe devolver `201 Created` |
| BUG-011 | PUT /products/:id | Actualiza producto inexistente sin error | Devuelve `200 OK` aunque el ID no exista | Debe verificar existencia y devolver `404` si no existe |

---

### Módulo Orders

| ID | Endpoint | Bug | Comportamiento actual | Comportamiento esperado |
|----|----------|-----|----------------------|------------------------|
| BUG-012 | POST /orders | Cálculo de total incorrecto | Total = suma de `unit_price` ignorando `quantity` | Total = suma de `unit_price * quantity` por item |
| BUG-013 | POST /orders | Stock no se descuenta | Después de una orden, el stock del producto no cambia | Debe decrementar `stock -= quantity` en cada producto |
| BUG-014 | POST /orders | Sin validación de stock suficiente | Permite crear órdenes aunque `quantity > stock` | Validar disponibilidad antes de crear, devolver 400 |
| BUG-015 | POST /orders | Status code incorrecto | Devuelve `200 OK` | Debe devolver `201 Created` |
| BUG-016 | PATCH /orders/:id/status | Sin validación de valores de status | Acepta cualquier string como status (`"banana"`, `"xyz"`) | Solo aceptar: `pending`, `processing`, `shipped`, `delivered`, `cancelled` |

---

## Estructura de la base de datos

```sql
-- Tabla users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,     -- BUG-003: sin hash
  role TEXT DEFAULT 'customer',
  created_at TEXT
);

-- Tabla products
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,        -- BUG-008: acepta negativos
  stock INTEGER,              -- BUG-009: acepta NULL y negativos
  category TEXT,
  created_at TEXT
);

-- Tabla orders
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total REAL,                 -- BUG-012: calculado incorrectamente
  status TEXT DEFAULT 'pending', -- BUG-016: acepta cualquier valor
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla order_items
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

---

## Estructura del proyecto

```
BuggyStore_API/
├── app.js              # Entry point
├── db.js               # Inicialización SQLite (JSON persistente)
├── routes/
│   ├── users.js        # Módulo usuarios (BUG-001 al 006)
│   ├── products.js     # Módulo productos (BUG-007 al 011)
│   └── orders.js       # Módulo órdenes (BUG-012 al 016)
├── buggystore_db.json  # Base de datos (se crea al primer inicio)
├── package.json
└── README.md
```

---

## Artefactos QA sugeridos

Para completar el portfolio, generá los siguientes documentos:

1. **`docs/plan-de-pruebas.md`** — Plan de pruebas completo
2. **`docs/test-cases.xlsx`** — Casos de prueba con técnicas de caja negra
3. **`docs/bug-reports.md`** — Reporte de cada bug encontrado
4. **`postman/BuggyStore.postman_collection.json`** — Colección con assertions
5. **`sql/validaciones.sql`** — Queries de validación de datos

---

## Tecnologías

- Node.js + Express 5
- JSON persistente en disco (db.js)
- jsonwebtoken

---

## 👤 Autor: Matias Alejandro Escobar

Proyecto de portfolio QA — Diplomatura en Control de Calidad de Software, UNTREF
