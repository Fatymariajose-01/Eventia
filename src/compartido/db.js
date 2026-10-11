// Capa de datos: una sola base de datos relacional (SQLite) para todo el MVP.
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', '..', 'eventia.db'));
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  rol TEXT NOT NULL DEFAULT 'asistente',
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  ciudad TEXT,
  fecha TEXT NOT NULL,
  cupo_total INTEGER NOT NULL,
  cupo_disponible INTEGER NOT NULL,
  organizador_id INTEGER REFERENCES usuarios(id)
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

// Datos de ejemplo para poder probar el flujo de inmediato
if (db.prepare('SELECT COUNT(*) c FROM usuarios').get().c === 0) {
  db.prepare("INSERT INTO usuarios (nombre, correo, rol) VALUES ('Organizador Demo','org@eventia.com','organizador')").run();
  db.prepare("INSERT INTO usuarios (nombre, correo) VALUES ('Ana López','ana@correo.com')").run();
  const ins = db.prepare('INSERT INTO eventos (titulo, descripcion, ciudad, fecha, cupo_total, cupo_disponible, organizador_id) VALUES (?,?,?,?,?,?,1)');
  ins.run('Taller de Desarrollo Web', 'Introducción a HTML, CSS y JavaScript', 'Quetzaltenango', '2026-11-05', 30, 30);
  ins.run('Feria de Emprendimiento', 'Emprendedores locales presentan sus proyectos', 'Guatemala', '2026-11-12', 100, 100);
  ins.run('Concierto Acústico', 'Noche de música en vivo', 'Quetzaltenango', '2026-11-20', 3, 3);
}

module.exports = db;
