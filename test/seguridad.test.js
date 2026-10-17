// Pruebas de los controles de seguridad. Ejecutar con: npm test
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secreto-de-pruebas';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

let servidor, base;
before(() => new Promise((ok) => { servidor = app.listen(0, () => { base = `http://localhost:${servidor.address().port}`; ok(); }); }));
after(() => servidor.close());

async function api(metodo, ruta, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(base + ruta, { method: metodo, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}
const login = async (correo, password) => (await api('POST', '/api/auth/login', { body: { correo, password } })).body.token;

test('API 2: el registro ignora/rechaza el rol enviado por el cliente', async () => {
  const ok = await api('POST', '/api/usuarios', { body: { nombre: 'Luis', correo: 'luis@correo.com', password: 'Segura123' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.rol, 'usuario');
  const malo = await api('POST', '/api/usuarios', { body: { nombre: 'Ana', correo: 'ana2@email.com', password: '123456', rol: 'administrador' } });
  assert.equal(malo.status, 400);
  assert.ok(malo.body.detalles.includes('Propiedad no permitida: rol'));
});

test('API 3: solo organizadores crean eventos y los datos se validan', async () => {
  const org = await login('org@eventia.com', 'Organizador123!');
  const ana = await login('ana@correo.com', 'Usuario123!');
  const valido = { titulo: 'Concierto universitario', fecha: '2027-05-10', cupo: 150, precio: 75 };
  assert.equal((await api('POST', '/api/eventos', { body: valido, token: org })).status, 201);
  const invalido = await api('POST', '/api/eventos', { body: { titulo: 'Concierto universitario', fecha: '2027-05-10', cupo: -50, precio: -100 }, token: org });
  assert.equal(invalido.status, 400);
  assert.equal(invalido.body.detalles.length, 2);
  assert.equal((await api('POST', '/api/eventos', { body: valido, token: ana })).status, 403);
  assert.equal((await api('POST', '/api/eventos', { body: valido })).status, 401);
});

test('API 1: solo el dueño (u organizador del evento / admin) consulta una inscripción', async () => {
  const carlos = await login('carlos@correo.com', 'Usuario123!');
  const ana = await login('ana@correo.com', 'Usuario123!');
  const propia = await api('GET', '/api/inscripciones/1', { token: carlos });
  assert.equal(propia.status, 200);
  assert.equal(propia.body.correo, undefined);
  assert.equal((await api('GET', '/api/inscripciones/1', { token: ana })).status, 403);
});

test('API 4: un organizador no puede modificar eventos ajenos', async () => {
  const org = await login('org@eventia.com', 'Organizador123!');
  const org2 = await login('org2@eventia.com', 'Organizador123!');
  assert.equal((await api('PUT', '/api/eventos/1', { body: { precio: 10 }, token: org })).status, 200);
  assert.equal((await api('PUT', '/api/eventos/1', { body: { precio: 0 }, token: org2 })).status, 403);
});

test('API 5: no se acepta "cantidad" y los cupos se controlan con solicitudes simultáneas', async () => {
  const carlos = await login('carlos@correo.com', 'Usuario123!');
  const r = await api('POST', '/api/eventos/3/inscripciones', { body: { cantidad: 500 }, token: carlos });
  assert.equal(r.status, 400);
  // Evento 3 tiene 3 cupos: 6 usuarios intentan inscribirse al mismo tiempo.
  const tokens = [];
  for (let i = 0; i < 6; i++) {
    await api('POST', '/api/usuarios', { body: { nombre: `P${i}`, correo: `p${i}@correo.com`, password: 'Segura123' } });
    tokens.push(await login(`p${i}@correo.com`, 'Segura123'));
  }
  const res = await Promise.all(tokens.map((t) => api('POST', '/api/eventos/3/inscripciones', { token: t })));
  assert.equal(res.filter((x) => x.status === 201).length, 3);
  assert.equal(res.filter((x) => x.status === 409).length, 3);
  assert.equal((await api('GET', '/api/eventos/3/disponibilidad')).body.cupo_disponible, 0);
});

test('API 6: la consulta de usuario solo devuelve campos públicos y solo al dueño', async () => {
  const carlos = await login('carlos@correo.com', 'Usuario123!');
  const ana = await login('ana@correo.com', 'Usuario123!');
  const r = await api('GET', '/api/usuarios/5', { token: carlos });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body).sort(), ['correo', 'id', 'nombre']);
  assert.equal((await api('GET', '/api/usuarios/5', { token: ana })).status, 403);
});

test('API 7: login con mensaje genérico y límite de intentos', async () => {
  const noExiste = await api('POST', '/api/auth/login', { body: { correo: 'nadie@correo.com', password: 'x' } });
  const claveMala = await api('POST', '/api/auth/login', { body: { correo: 'ana@correo.com', password: 'incorrecta' } });
  assert.equal(noExiste.status, 401);
  assert.equal(claveMala.status, 401);
  assert.equal(noExiste.body.error, claveMala.body.error);
  let ultimo;
  for (let i = 0; i < 5; i++) ultimo = await api('POST', '/api/auth/login', { body: { correo: 'ana@correo.com', password: 'incorrecta' } });
  assert.equal(ultimo.status, 429);
});
