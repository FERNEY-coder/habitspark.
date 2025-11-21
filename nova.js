document.addEventListener('DOMContentLoaded', () => {
  const mensaje = document.getElementById('nova-mensaje');
  const url = window.location.href;

  const mensajesPorSeccion = {
    salud: 'Aquí puedes calcular tu IMC y registrar tu progreso físico.',
    perfil: 'Edita tu avatar y descripción para personalizar tu perfil.',
    biblioteca: 'Explora libros recomendados y activa el modo lectura.',
    dashboard: 'Consulta tus hábitos, progreso y logros diarios.',
    logros: 'Aquí verás tus medallas y avances desbloqueados.'
  };

  for (const clave in mensajesPorSeccion) {
    if (url.includes(clave)) {
      mensaje.textContent = mensajesPorSeccion[clave];
      break;
    }
  }

  // Interacción: clic en Nova para mostrar ayuda
  document.getElementById('nova-avatar').addEventListener('click', () => {
    alert('Nova dice: ¡Estoy aquí para ayudarte! ¿Qué necesitas?');
  });

  // Reacción contextual si no hay hábitos
  const lista = document.getElementById('lista');
  if (lista && lista.children.length === 0) {
    mensaje.textContent = 'No tienes hábitos aún. ¿Quieres crear uno?';
  }
});

// Mascota animada y reactiva
function animarMascota(mensaje) {
  const mascota = document.getElementById('mascota');
  const mensajeDiv = document.getElementById('mensaje-mascota');

  if (!mascota || !mensajeDiv) return;

  mascota.classList.add('animar');
  mensajeDiv.textContent = mensaje;

  setTimeout(() => {
    mascota.classList.remove('animar');
    mensajeDiv.textContent = '';
  }, 2000);
}

// Reacción por tipo de evento
function reaccionMascota(tipo) {
  const mascota = document.getElementById('mascota');
  const mensajeDiv = document.getElementById('mensaje-mascota');

  if (!mascota || !mensajeDiv) return;

  if (tipo === 'nuevo') {
    mascota.src = '/img/mascota_feliz.png';
    mensajeDiv.textContent = '🎉 ¡Nuevo hábito creado!';
  } else if (tipo === 'registro') {
    mascota.src = '/img/mascota_lectura.png';
    mensajeDiv.textContent = '📖 ¡Registro guardado!';
  } else {
    mascota.src = '/img/mascota_idle.png';
    mensajeDiv.textContent = '¡Listo para ayudarte!';
  }

  mascota.classList.add('animar');
  setTimeout(() => {
    mascota.classList.remove('animar');
    mascota.src = '/img/mascota_idle.png';
    mensajeDiv.textContent = '';
  }, 3000);
}
