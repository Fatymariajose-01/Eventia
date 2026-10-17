// Capa de datos: una sola base de datos relacional (SQLite) para todo el monolito.
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'eventia.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  telefono TEXT,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario','organizador','administrador')),
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  ciudad TEXT,
  fecha TEXT NOT NULL,
  precio REAL NOT NULL DEFAULT 0 CHECK (precio >= 0),
  cupo_total INTEGER NOT NULL CHECK (cupo_total > 0),
  cupo_disponible INTEGER NOT NULL CHECK (cupo_disponible >= 0),
  organizador_id INTEGER NOT NULL REFERENCES usuarios(id)
);
CREATE TABLE IF NOT EXISTS inscripciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  evento_id INTEGER NOT NULL REFERENCES eventos(id),
  fecha_inscripcion TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (usuario_id, evento_id)
);
CREATE TABLE IF NOT EXISTS notificaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  mensaje TEXT NOT NULL,
  enviada_en TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Datos iniciales de ejemplo si la tabla de usuarios está vacía
if (db.prepare('SELECT COUNT(*) AS c FROM usuarios').get().c === 0) {
  const insUsuario = db.prepare(`
    INSERT INTO usuarios (id, nombre, correo, password_hash, rol, telefono)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insUsuario.run(1, 'Administrador', 'admin@eventia.com', bcrypt.hashSync('Admin123!', 10), 'administrador', null);
  insUsuario.run(2, 'Organizador Uno', 'org@eventia.com', bcrypt.hashSync('Organizador123!', 10), 'organizador', null);
  insUsuario.run(3, 'Organizador Dos', 'org2@eventia.com', bcrypt.hashSync('Organizador123!', 10), 'organizador', null);
  insUsuario.run(4, 'Ana López', 'ana@correo.com', bcrypt.hashSync('Usuario123!', 10), 'usuario', '44444444');
  insUsuario.run(5, 'Carlos Pérez', 'carlos@correo.com', bcrypt.hashSync('Usuario123!', 10), 'usuario', '55555555');

  const insEvento = db.prepare(`
    INSERT INTO eventos (id, titulo, descripcion, ciudad, fecha, precio, cupo_total, cupo_disponible, organizador_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insEvento.run(
    1,
    'Taller de Desarrollo Web',
    'Introducción a HTML, CSS y JavaScript',
    'Quetzaltenango',
    '2027-03-05',
    0,
    30,
    29,
    2
  );

  insEvento.run(
    2,
    'Feria de Emprendimiento',
    'Emprendedores locales presentan sus proyectos',
    'Guatemala',
    '2027-03-12',
    25,
    100,
    100,
    2
  );

  insEvento.run(
    3,
    'Concierto Acústico',
    'Noche de música en vivo',
    'Quetzaltenango',
    '2027-03-20',
    50,
    3,
    3,
    3
  );

  db.prepare(`
    INSERT INTO inscripciones (id, usuario_id, evento_id)
    VALUES (1, 5, 1)
  `).run();
}

module.exports = db;
