// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

/* ---------------- CORS ---------------- */
app.use(cors({
  origin: ["http://localhost:3000", "https://habitospark.onrender.com"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

/* ---------------- Seguridad (Helmet) ---------------- */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://cdn.jsdelivr.net"],
        "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        "img-src": ["'self'", "data:", "https://*", "http://*"],
        "connect-src": ["'self'", "http://localhost:3000", "https://habitospark.onrender.com", "https://cdn.jsdelivr.net"]
      }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

/* ---------------- Parsers y estáticos ---------------- */
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pdfs', express.static(path.join(__dirname, 'public/pdfs')));

/* ---------------- Sesión ---------------- */
app.use(session({
  secret: 'cambia_estesecreto',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // en producción usar secure: true con HTTPS
}));

/* ---------------- Conexión MySQL ---------------- */
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'habitspark',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* ---------------- Helpers ---------------- */
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  next();
}

/* ---------------- Rutas de cuenta ---------------- */
app.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  res.json({ id: req.session.userId, nombre: req.session.nombre });
});

/* Registro con verificación de duplicados y manejo de ER_DUP_ENTRY */
app.post('/register', async (req, res) => {
  const { nombre, email, password, altura_cm } = req.body;

  // Validación básica
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // 1) Verificar si el email ya existe
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Este correo ya está registrado' });
    }

    // 2) Hashear contraseña e insertar
    const hash = await bcrypt.hash(password, 10);
    const [resInsert] = await pool.query(
      'INSERT INTO users (nombre, email, password_hash, altura_cm) VALUES (?, ?, ?, ?)',
      [nombre, email, hash, altura_cm || null]
    );

    // 3) Crear sesión y responder
    req.session.userId = resInsert.insertId;
    req.session.nombre = nombre;
    res.status(201).json({ success: true, redirect: '/index.html' });

  } catch (err) {
    console.error('Error creando usuario:', err);

    // Manejo explícito de duplicado por si ocurre condición de carrera
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Este correo ya está registrado' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/* Login */
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Faltan campos' });

  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, password_hash FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

    req.session.userId = user.id;
    req.session.nombre = user.nombre;
    res.status(200).json({ success: true, redirect: '/dashboard.html' });
  } catch (err) {
    console.error('Error en el login:', err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.status(200).json({ success: true }));
});

/* ---------------- Rutas de hábitos ---------------- */
app.get('/api/habits', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM habits WHERE user_id = ?', [req.session.userId]);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener hábitos:', err);
    res.status(500).json({ error: 'Error al obtener hábitos' });
  }
});

app.post('/habits', requireAuth, async (req, res) => {
  const { nombre, objetivo_minutos_per, periodo } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO habits (user_id, nombre, objetivo_minutos_per, periodo) VALUES (?, ?, ?, ?)',
      [req.session.userId, nombre, objetivo_minutos_per, periodo]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error al crear hábito:', err);
    res.status(500).json({ error: 'Error al crear hábito' });
  }
});

app.post('/habits/:id/log', requireAuth, async (req, res) => {
  const habitId = req.params.id;
  const { fecha, minutos } = req.body;
  const completado = minutos >= 1 ? 1 : 0;
  try {
    await pool.query(
      `INSERT INTO habit_logs (habit_id, user_id, fecha, minutos, completado)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE minutos = VALUES(minutos), completado = VALUES(completado)`,
      [habitId, req.session.userId, fecha, minutos, completado]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al guardar registro:', err);
    res.status(500).json({ error: 'Error al guardar registro' });
  }
});

app.get('/habits/:id/logs', requireAuth, async (req, res) => {
  const habitId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT fecha, minutos FROM habit_logs
       WHERE habit_id = ? AND user_id = ?
       ORDER BY fecha ASC`,
      [habitId, req.session.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener registros:', err);
    res.status(500).json({ error: 'Error al obtener registros' });
  }
});

app.get('/api/habits/:id/summary', requireAuth, async (req, res) => {
  const habitId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT fecha, minutos, completado FROM habit_logs
       WHERE habit_id = ? AND user_id = ?
       ORDER BY fecha ASC`,
      [habitId, req.session.userId]
    );
    let streak = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].completado) streak++;
      else break;
    }
    res.json({ streak, rows });
  } catch (err) {
    console.error('Error obteniendo estadísticas:', err);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

/* ---------------- Libros del usuario ---------------- */
app.post('/libros', requireAuth, async (req, res) => {
  const { titulo, autor, total_paginas, fecha_inicio } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO libros (user_id, titulo, autor, total_paginas, fecha_inicio) VALUES (?, ?, ?, ?, ?)',
      [req.session.userId, titulo, autor, total_paginas, fecha_inicio]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error al crear libro:', err);
    res.status(500).send('Error al crear libro');
  }
});

app.post('/libros/:id/log', requireAuth, async (req, res) => {
  const libroId = req.params.id;
  const { fecha, paginas_leidas } = req.body;
  try {
    await pool.query(
      `INSERT INTO lectura_logs (libro_id, user_id, fecha, paginas_leidas)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE paginas_leidas = VALUES(paginas_leidas)`,
      [libroId, req.session.userId, fecha, paginas_leidas]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error al registrar lectura:', err);
    res.status(500).send('Error al registrar lectura');
  }
});

app.get('/libros/:id/progreso', requireAuth, async (req, res) => {
  const libroId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT fecha, paginas_leidas FROM lectura_logs
       WHERE libro_id = ? AND user_id = ?
       ORDER BY fecha ASC`,
      [libroId, req.session.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener progreso:', err);
    res.status(500).send('Error al obtener progreso');
  }
});

/* ---------------- Biblioteca recomendada ---------------- */
app.get('/biblioteca/recomendaciones', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, titulo, autor, descripcion, categoria, imagen_url, pdf_url, created_at FROM libros_recomendados'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener libros desde la base de datos:', err);
    res.status(500).json({ error: 'Error al obtener libros' });
  }
});

app.get('/biblioteca/libro/:id', async (req, res) => {
  const libroId = req.params.id;
  try {
    const [rows] = await pool.query(
      'SELECT id, titulo, autor, descripcion FROM libros_recomendados WHERE id = ?',
      [libroId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Libro no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener libro:', err);
    res.status(500).json({ error: 'Error al obtener libro' });
  }
});

/* ---------------- Rutas de salud ---------------- */
app.get('/salud', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT altura_cm, peso_kg, imc, agua_vasos, pasos, sueno_min FROM salud WHERE user_id = ?',
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.json({
        altura_cm: null,
        peso_kg: null,
        imc: null,
        agua_vasos: 0,
        pasos: 0,
        sueno_min: 0
      });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error('Error al obtener salud:', err);
    res.status(500).json({ error: 'Error al obtener datos de salud' });
  }
});


app.post('/salud/actualizar', requireAuth, async (req, res) => {
  const { peso_kg, imc, agua_vasos, pasos, sueno_min } = req.body;

  try {
    await pool.query(
      `INSERT INTO salud (user_id, peso_kg, imc, agua_vasos, pasos, sueno_min)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         peso_kg = VALUES(peso_kg),
         imc = VALUES(imc),
         agua_vasos = VALUES(agua_vasos),
         pasos = VALUES(pasos),
         sueno_min = VALUES(sueno_min)`,
      [
        req.session.userId,
        peso_kg ?? null,
        imc ?? null,
        agua_vasos ?? 0,
        pasos ?? 0,
        sueno_min ?? 0
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error al actualizar salud:', err);
    res.status(500).json({ error: 'Error al actualizar datos de salud' });
  }
});
/* -------------------------------------------------------------
   📚 BIBLIOTECA — PASO 2 (Integración completa)
--------------------------------------------------------------*/

// Registrar lectura diaria (con ON DUPLICATE)
app.post('/biblioteca/lectura/:id', requireAuth, async (req, res) => {
  const libroId = req.params.id;
  const { fecha, paginas_leidas } = req.body;

  try {
    await pool.query(
      `INSERT INTO lectura_logs (libro_id, user_id, fecha, paginas_leidas)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE paginas_leidas = VALUES(paginas_leidas)`,
      [libroId, req.session.userId, fecha, paginas_leidas]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error registrando lectura:", err);
    res.status(500).json({ error: "Error registrando lectura" });
  }
});

// Progreso completo por fecha (para gráfica)
app.get('/biblioteca/lectura/:id/progreso', requireAuth, async (req, res) => {
  const libroId = req.params.id;

  try {
    const [rows] = await pool.query(
      `SELECT fecha, paginas_leidas 
       FROM lectura_logs
       WHERE libro_id = ? AND user_id = ?
       ORDER BY fecha ASC`,
      [libroId, req.session.userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error obteniendo progreso:", err);
    res.status(500).json({ error: "Error obteniendo progreso" });
  }
});

// Logros del libro (páginas totales, racha, completado)
app.get('/biblioteca/lectura/:id/logros', requireAuth, async (req, res) => {
  const libroId = req.params.id;

  try {
    const [rows] = await pool.query(
      `SELECT 
         COALESCE(SUM(l.paginas_leidas), 0) AS paginas_leidas,
         COALESCE(COUNT(DISTINCT l.fecha), 0) AS racha,
         CASE 
           WHEN COALESCE(SUM(l.paginas_leidas), 0) >= b.total_paginas 
           THEN 1 ELSE 0 
         END AS completado
       FROM lectura_logs l
       LEFT JOIN libros b ON b.id = l.libro_id
       WHERE l.libro_id = ? AND l.user_id = ?`,
      [libroId, req.session.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Error obteniendo logros:", err);
    res.status(500).json({ error: "Error obteniendo logros" });
  }
});

/* ----------- Favoritos ------------------ */

// Agregar libro a favoritos
app.post('/biblioteca/favoritos/:id', requireAuth, async (req, res) => {
  const libroId = req.params.id;

  try {
    await pool.query(
      `INSERT INTO favoritos (user_id, libro_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE libro_id = libro_id`,
      [req.session.userId, libroId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error agregando favorito:", err);
    res.status(500).json({ error: "Error agregando favorito" });
  }
});

// Listar favoritos
app.get('/biblioteca/favoritos', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.libro_id, r.titulo, r.autor, r.imagen_url
       FROM favoritos f
       INNER JOIN libros_recomendados r ON r.id = f.libro_id
       WHERE f.user_id = ?`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error obteniendo favoritos:", err);
    res.status(500).json({ error: "Error obteniendo favoritos" });
  }
});

// Quitar favorito
app.delete('/biblioteca/favoritos/:id', requireAuth, async (req, res) => {
  const libroId = req.params.id;

  try {
    await pool.query(
      `DELETE FROM favoritos WHERE user_id = ? AND libro_id = ?`,
      [req.session.userId, libroId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error quitando favorito:", err);
    res.status(500).json({ error: "Error quitando favorito" });
  }
});


/* ---------------- Iniciar servidor ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
