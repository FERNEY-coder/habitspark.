document.addEventListener('DOMContentLoaded', () => {
  const btnCambiarAvatar = document.getElementById('btn-cambiar-avatar');
  const galeria = document.getElementById('galeria-avatares');
  const avatarActual = document.getElementById('avatar-actual');
  const avatarOpciones = document.querySelectorAll('.avatar-opcion');
  const btnEditarDescripcion = document.getElementById('btn-editar-descripcion');
  const descripcion = document.getElementById('descripcion-usuario');
  const nombreUsuario = document.getElementById('nombre-usuario');
  const fraseMotivadora = document.getElementById('info-motivacion');

  // Frases motivadoras
  const frases = [
    "¡Sigue así, Ferney!", "Tu progreso es constante y admirable.",
    "Cada hábito te acerca a tu mejor versión.", "¡Tu perfil refleja tu evolución!",
    "Estás construyendo una versión más fuerte de ti mismo.", "Tu esfuerzo silencioso está creando resultados ruidosos.",
    "Lo que hoy parece pequeño, mañana será tu gran logro.", "Tu evolución no se detiene, y eso se nota.",
    "Tu constancia está dejando huella en tu camino.", "¡Tu energía me inspira a seguir guiándote!"
  ];

  // Mostrar frase aleatoria
  fraseMotivadora.textContent = frases[Math.floor(Math.random() * frases.length)];

  // Mostrar/ocultar galería de avatares
  btnCambiarAvatar.addEventListener('click', () => {
    galeria.style.display = galeria.style.display === 'none' ? 'block' : 'none';
  });

  // Selección de avatar
  avatarOpciones.forEach(img => {
    img.addEventListener('click', () => {
      avatarActual.src = img.src;
      galeria.style.display = 'none';
      guardarPerfil(img.src, descripcion.textContent);
      mostrarFeedback("¡Avatar actualizado!");
    });
  });

  // Edición de descripción
  btnEditarDescripcion.addEventListener('click', () => {
    const nuevaDescripcion = prompt('Escribe tu nueva descripción:', descripcion.textContent);
    if (nuevaDescripcion && nuevaDescripcion.trim() !== "") {
      descripcion.textContent = nuevaDescripcion;
      guardarPerfil(avatarActual.src, nuevaDescripcion);
      mostrarFeedback("¡Descripción actualizada!");
    }
  });

  // Guardar avatar y descripción en backend
  async function guardarPerfil(avatarUrl, descripcion) {
    try {
      const res = await fetch('http://localhost:3000/perfil/actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: avatarUrl, descripcion })
      });
      const data = await res.json();
      if (data.success) {
        console.log('Perfil actualizado');
      }
    } catch (error) {
      console.error('Error al guardar perfil:', error);
    }
  }

  // Cargar datos de salud
  async function cargarSaludPerfil() {
    try {
      const res = await fetch('/salud');
      const data = await res.json();
      document.getElementById('altura-perfil').textContent = `${data.altura_cm} cm`;
      document.getElementById('peso-perfil').textContent = `${data.peso_kg} kg`;
      document.getElementById('imc-perfil').textContent = data.imc;
    } catch (error) {
      console.error('Error al cargar salud:', error);
    }
  }

  // Cargar perfil completo
  async function cargarPerfil() {
    try {
      const res = await fetch('http://localhost:3000/perfil');
      const data = await res.json();
      if (data.avatar_url) avatarActual.src = data.avatar_url;
      if (data.descripcion) descripcion.textContent = data.descripcion;
      if (data.nombre) nombreUsuario.textContent = data.nombre;
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    }
  }
  

  // Inicializar
  cargarPerfil();
  cargarSaludPerfil();
});
