// Variables globales
let todosLosLibros = [];
let libroActual = null;
let paginas = [];
let paginaActual = 1;
let totalPaginas = 1;

// Cargar al iniciar
document.addEventListener('DOMContentLoaded', () => {
  const btnCerrar = document.getElementById('btn-cerrar-lectura');
  if (btnCerrar) btnCerrar.addEventListener('click', cerrarLectura);

  cargarBiblioteca();

  const inputBuscar = document.getElementById('buscar-titulo');
  const selectCategoria = document.getElementById('filtrar-categoria');

  if (inputBuscar) inputBuscar.addEventListener('input', filtrarLibros);
  if (selectCategoria) selectCategoria.addEventListener('change', filtrarLibros);
});

// Cargar libros desde backend

async function cargarBiblioteca() {
  try {
    const res = await fetch('http://localhost:3000/biblioteca/recomendaciones');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    todosLosLibros = await res.json();
    mostrarLibros(todosLosLibros);
  } catch (error) {
    console.error('Error al cargar los libros:', error);
    document.getElementById('lista-libros').innerHTML = '<p style="color:red;">No se pudieron cargar los libros.</p>';
  }
}

// Mostrar tarjetas

function mostrarLibros(libros) {
  const contenedor = document.getElementById('lista-libros');
  contenedor.innerHTML = '';

  if (libros.length === 0) {
    contenedor.innerHTML = '<p style="color:var(--muted);">No se encontraron libros.</p>';
    return;
  }

  libros.forEach(libro => {
    const card = document.createElement('div');
    card.className = 'libro-card';

    card.innerHTML = `
      <img src="${libro.imagen_url || '/covers/default.png'}" alt="Portada">
      <h4>${libro.titulo}</h4>
      <p><strong>${libro.autor}</strong></p>
      <p>${libro.descripcion || 'Sin descripción.'}</p>
    `;

    if (libro.pdf_url) {
      const link = document.createElement('a');
      link.textContent = 'Leer PDF';
      link.href = libro.pdf_url;
      link.target = '_blank';
      link.className = 'btn-leer';
      card.appendChild(link);

    } else {
      const btn = document.createElement('button');
      btn.className = 'btn-leer';
      btn.textContent = 'Leer';
      btn.addEventListener('click', () => leerLibro(libro.id));
      card.appendChild(btn);
    }

    contenedor.appendChild(card);
  });
}

// Filtrar libros

function filtrarLibros() {
  const titulo = document.getElementById('buscar-titulo').value.toLowerCase();
  const categoria = document.getElementById('filtrar-categoria').value;

  const filtrados = todosLosLibros.filter(l =>
    l.titulo.toLowerCase().includes(titulo) && (categoria === '' || l.categoria === categoria)
  );

  mostrarLibros(filtrados);
}

// Abrir lectura

async function leerLibro(id) {
  try {
    const res = await fetch(`http://localhost:3000/biblioteca/libro/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const libro = await res.json();
    libroActual = libro;

    document.getElementById('titulo-libro').textContent = libro.titulo;
    document.getElementById('autor-libro').textContent = libro.autor;

    prepararPaginas(libro.contenido || 'Sin contenido.');

    document.getElementById('modo-lectura').style.display = 'block';

    mostrarPagina(1);

    await mostrarLogrosLectura(id);

    // Activar barra progreso automática
    activarScrollProgeso();

  } catch (error) {
    console.error('Error al abrir libro:', error);
    alert('No se pudo abrir el libro.');
  }
}

// Crear páginas virtuales

function prepararPaginas(texto) {
  const charsPorPagina = 1200;
  paginas = [];

  for (let i = 0; i < texto.length; i += charsPorPagina) {
    paginas.push(texto.slice(i, i + charsPorPagina));
  }

  totalPaginas = paginas.length;
}

// Mostrar página manual

function mostrarPagina(num) {
  paginaActual = Math.max(1, Math.min(totalPaginas, num));

  document.getElementById('contenido-libro').innerText = paginas[paginaActual - 1];
  document.getElementById('pagina-input').value = paginaActual;
  document.getElementById('contador-pagina').innerText = `Página ${paginaActual} / ${totalPaginas}`;

  actualizarBarraProgreso();

  guardarProgreso();
}

// Botón "ir pagina manual"

document.addEventListener('click', e => {
  if (e.target.id === 'btn-ir-pagina') {
    const numero = parseInt(document.getElementById('pagina-input').value);
    if (!isNaN(numero)) mostrarPagina(numero);
  }
});


// Progreso automático por scroll

function activarScrollProgeso() {
  const contenedor = document.getElementById('contenido-libro');

  contenedor.addEventListener('scroll', () => {
    const porcentajeScroll = contenedor.scrollTop / (contenedor.scrollHeight - contenedor.clientHeight);
    const paginaCalc = Math.ceil(porcentajeScroll * totalPaginas);

    if (paginaCalc > 0) mostrarPagina(paginaCalc);
  });
}


// Actualizar barra progreso

function actualizarBarraProgreso() {
  const barra = document.getElementById('barra-progreso');
  const porcentaje = (paginaActual / totalPaginas) * 100;
  barra.style.width = porcentaje + '%';
}


// Guardar progreso en backend
async function guardarProgreso() {
  if (!libroActual) return;

  await fetch('http://localhost:3000/biblioteca/progreso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      libroId: libroActual.id,
      pagina: paginaActual,
      totalPaginas
    })
  });
}


// Logros lectura
async function mostrarLogrosLectura(id) {
  try {
    const res = await fetch(`http://localhost:3000/biblioteca/logro/${id}`);
    const data = await res.json();

    const logros = document.getElementById('logros-lectura');
    logros.innerHTML = '';

    if (!data) {
      logros.innerHTML = '<p> Comenzaste este libro</p>';
      return;
    }

    logros.innerHTML += `<p> Páginas leídas: <strong>${data.paginas_leidas}</strong></p>`;
    logros.innerHTML += `<p> Racha: <strong>${data.racha} días</strong></p>`;
    if (data.completado) logros.innerHTML += '<p>🏆 ¡Libro completado!</p>';

  } catch (error) {
    console.error('Error logros:', error);
  }
}

// Cerrar lectura
function cerrarLectura() {
  document.getElementById('modo-lectura').style.display = 'none';
}

// ----- TRACKING LECTURA (CRONÓMETRO + SCROLL %) -----
let lecturaSesion = {
  libroId: null,
  tipo: 'texto', // 'texto' o 'pdf'
  activo: false,
  segundosActivos: 0,
  porcentajeActual: 0,
  _intervalId: null,
  _lastActivityTs: null,
  _idleTimeout: 30, // segundos para considerar inactivo
};

// Llamar al abrir el libro
function iniciarSesionLectura(libroId, tipo = 'texto') {
  // reset
  lecturaSesion.libroId = libroId;
  lecturaSesion.tipo = tipo;
  lecturaSesion.activo = true;
  lecturaSesion.segundosActivos = 0;
  lecturaSesion.porcentajeActual = 0;
  lecturaSesion._lastActivityTs = Date.now();

  // interval para contar segundos activos cada 1s
  if (lecturaSesion._intervalId) clearInterval(lecturaSesion._intervalId);
  lecturaSesion._intervalId = setInterval(() => {
    // solo aumentar si considerado activo
    if (lecturaSesion.activo && !isInIdle()) {
      lecturaSesion.segundosActivos += 1;
    }
  }, 1000);

  // listeners de actividad
  window.addEventListener('mousemove', onUserActivity);
  window.addEventListener('keydown', onUserActivity);
  window.addEventListener('scroll', onUserActivity, true); // capture
  document.addEventListener('visibilitychange', onVisibilityChange);
}

// Pausar y reanudar
function pausarSesionLectura() {
  lecturaSesion.activo = false;
}
function reanudarSesionLectura() {
  lecturaSesion.activo = true;
  lecturaSesion._lastActivityTs = Date.now();
}

// Determinar inactividad
function isInIdle() {
  const secs = (Date.now() - lecturaSesion._lastActivityTs) / 1000;
  return secs > lecturaSesion._idleTimeout;
}

// actividad del usuario
function onUserActivity() {
  lecturaSesion._lastActivityTs = Date.now();
  if (!lecturaSesion.activo) reanudarSesionLectura();
}

// visibilidad (pestaña)
function onVisibilityChange() {
  if (document.hidden) pausarSesionLectura();
  else reanudarSesionLectura();
}

// Al cerrar la lectura (o cada X segundos) enviar al backend
async function finalizarYEnviarSesion() {
  if (!lecturaSesion.libroId) return;

  // si aún no se estableció porcentaje (ej: PDF cross-origin), intenta calcular
  if (lecturaSesion.tipo === 'texto') {
    lecturaSesion.porcentajeActual = calcularPorcentajeContenido();
  }

  // enviar al backend
  try {
    await fetch('/biblioteca/lectura/tiempo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        libroId: lecturaSesion.libroId,
        segundos: lecturaSesion.segundosActivos,
        porcentaje: Math.round(lecturaSesion.porcentajeActual || 0),
        tipo: lecturaSesion.tipo
      })
    });
    // opcional: puedes actualizar UI con feedback
    console.log('Lectura guardada:', lecturaSesion);
  } catch (err) {
    console.error('Error guardando tiempo lectura:', err);
  } finally {
    limpiarSesionLectura();
  }
}

// limpieza
function limpiarSesionLectura() {
  lecturaSesion.libroId = null;
  lecturaSesion.activo = false;
  lecturaSesion.segundosActivos = 0;
  lecturaSesion.porcentajeActual = 0;
  if (lecturaSesion._intervalId) clearInterval(lecturaSesion._intervalId);
  lecturaSesion._intervalId = null;
  window.removeEventListener('mousemove', onUserActivity);
  window.removeEventListener('keydown', onUserActivity);
  window.removeEventListener('scroll', onUserActivity, true);
  document.removeEventListener('visibilitychange', onVisibilityChange);
}

// Calcula porcentaje por scroll dentro del contenedor #contenido-libro
function calcularPorcentajeContenido() {
  const cont = document.getElementById('contenido-libro');
  if (!cont) return 0;
  const scrollTop = cont.scrollTop;
  const maxScroll = cont.scrollHeight - cont.clientHeight;
  if (maxScroll <= 0) return 100;
  const pct = (scrollTop / maxScroll) * 100;
  return Math.min(100, Math.max(0, pct));
}

// Envío periódico (opcional) cada N segundos para evitar pérdida
let envioPeriodicoId = null;
function iniciarEnvioPeriodico(intervalSec = 30) {
  if (envioPeriodicoId) clearInterval(envioPeriodicoId);
  envioPeriodicoId = setInterval(() => {
    if (lecturaSesion.libroId) finalizarYEnviarSesion(); // guarda sesión parcial
  }, intervalSec * 1000);
}
function detenerEnvioPeriodico() {
  if (envioPeriodicoId) clearInterval(envioPeriodicoId);
  envioPeriodicoId = null;
}
