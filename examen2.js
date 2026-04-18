const http = require('http');

// Base de datos en memoria
let usuarios = [
  { id: 1, nombre: 'Ana García',    email: 'ana@email.com',     edad: 28, activo: true  },
  { id: 2, nombre: 'Carlos López',  email: 'carlos@email.com',  edad: 35, activo: true  },
  { id: 3, nombre: 'María Torres',  email: 'maria@email.com',   edad: 24, activo: true  },
  { id: 4, nombre: 'Pedro Ramírez', email: 'pedro@email.com',   edad: 41, activo: false },
  { id: 5, nombre: 'Laura Méndez',  email: 'laura@email.com',   edad: 30, activo: true  },
];
let nextId = 6;

// ── Helpers ──────────────────────────────────────────────────────────────────

function res(socket, status, data) {
  const body = JSON.stringify(data, null, 2);
  socket.writeHead(status, { 'Content-Type': 'application/json' });
  socket.end(body);
}

function validar(body, parcial = false) {
  const errores = [];
  const { nombre, email, edad, activo } = body;

  if (!parcial || nombre !== undefined)
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2)
      errores.push('nombre: requerido, mínimo 2 caracteres');

  if (!parcial || email !== undefined)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errores.push('email: formato inválido');

  if (!parcial || edad !== undefined)
    if (edad === undefined || !Number.isInteger(edad) || edad < 1 || edad > 120)
      errores.push('edad: entero entre 1 y 120');

  if (activo !== undefined && typeof activo !== 'boolean')
    errores.push('activo: debe ser true o false');

  return errores;
}

function leerBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error('JSON inválido')); }
    });
  });
}

// ── Router ────────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, socket) => {
  const { method, url } = req;

  // GET /usuarios
  if (method === 'GET' && url === '/usuarios') {
    return res(socket, 200, { ok: true, total: usuarios.length, data: usuarios });
  }

  // GET /usuarios/:id
  if (method === 'GET' && /^\/usuarios\/\d+$/.test(url)) {
    const id = parseInt(url.split('/')[2]);
    const user = usuarios.find(u => u.id === id);
    if (!user) return res(socket, 404, { ok: false, mensaje: 'Usuario no encontrado' });
    return res(socket, 200, { ok: true, data: user });
  }

  // POST /usuarios
  if (method === 'POST' && url === '/usuarios') {
    let body;
    try { body = await leerBody(req); }
    catch { return res(socket, 400, { ok: false, mensaje: 'JSON inválido' }); }

    const errores = validar(body);
    if (errores.length) return res(socket, 400, { ok: false, errores });

    if (usuarios.some(u => u.email === body.email))
      return res(socket, 400, { ok: false, mensaje: 'El email ya está registrado' });

    const nuevo = {
      id: nextId++,
      nombre: body.nombre.trim(),
      email: body.email.toLowerCase(),
      edad: body.edad,
      activo: body.activo ?? true,
    };
    usuarios.push(nuevo);
    return res(socket, 201, { ok: true, mensaje: 'Usuario creado', data: nuevo });
  }

  // PUT /usuarios/:id
  if (method === 'PUT' && /^\/usuarios\/\d+$/.test(url)) {
    const id = parseInt(url.split('/')[2]);
    const idx = usuarios.findIndex(u => u.id === id);
    if (idx === -1) return res(socket, 404, { ok: false, mensaje: 'Usuario no encontrado' });

    let body;
    try { body = await leerBody(req); }
    catch { return res(socket, 400, { ok: false, mensaje: 'JSON inválido' }); }

    const errores = validar(body);
    if (errores.length) return res(socket, 400, { ok: false, errores });

    if (usuarios.some(u => u.email === body.email && u.id !== id))
      return res(socket, 400, { ok: false, mensaje: 'El email ya está en uso' });

    usuarios[idx] = { id, nombre: body.nombre.trim(), email: body.email.toLowerCase(), edad: body.edad, activo: body.activo ?? usuarios[idx].activo };
    return res(socket, 200, { ok: true, mensaje: 'Usuario actualizado', data: usuarios[idx] });
  }

  // PATCH /usuarios/:id
  if (method === 'PATCH' && /^\/usuarios\/\d+$/.test(url)) {
    const id = parseInt(url.split('/')[2]);
    const idx = usuarios.findIndex(u => u.id === id);
    if (idx === -1) return res(socket, 404, { ok: false, mensaje: 'Usuario no encontrado' });

    let body;
    try { body = await leerBody(req); }
    catch { return res(socket, 400, { ok: false, mensaje: 'JSON inválido' }); }

    const errores = validar(body, true);
    if (errores.length) return res(socket, 400, { ok: false, errores });

    if (body.email && usuarios.some(u => u.email === body.email && u.id !== id))
      return res(socket, 400, { ok: false, mensaje: 'El email ya está en uso' });

    usuarios[idx] = { ...usuarios[idx], ...body };
    return res(socket, 200, { ok: true, mensaje: 'Usuario actualizado', data: usuarios[idx] });
  }

  // DELETE /usuarios/:id
  if (method === 'DELETE' && /^\/usuarios\/\d+$/.test(url)) {
    const id = parseInt(url.split('/')[2]);
    const idx = usuarios.findIndex(u => u.id === id);
    if (idx === -1) return res(socket, 404, { ok: false, mensaje: 'Usuario no encontrado' });

    const eliminado = usuarios.splice(idx, 1)[0];
    return res(socket, 200, { ok: true, mensaje: 'Usuario eliminado', data: eliminado });
  }

  // Ruta no encontrada
  res(socket, 404, { ok: false, mensaje: 'Ruta no encontrada' });
});

server.listen(3000, () => console.log('Servidor en http://localhost:3000'));


