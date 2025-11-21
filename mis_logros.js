document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/biblioteca/recomendados");
    const libros = await res.json();

    const logrosDiv = document.getElementById("lista-logros");
    logrosDiv.innerHTML = libros.map(libro => `
      <div class="logro">
        <h3>${libro.titulo}</h3>
        <p>Autor: ${libro.autor}</p>
        <a href="biblioteca.html">Ver libro</a>
      </div>
    `).join("");

    const medallasDiv = document.getElementById("lista-medallas");
    medallasDiv.innerHTML = `
      <span>🏅 Primer libro leído</span>
      <span>🔥 Racha de 7 días</span>
    `;
  } catch (err) {
    console.error("Error cargando logros:", err);
  }
});

async function evaluarLogros(userId) {
  const logros = await pool.query('SELECT * FROM logros');
  for (const logro of logros) {
    const cumple = await verificarCriterio(logro.criterio, userId);
    if (cumple) {
      await pool.query(
        'INSERT IGNORE INTO logros_desbloqueados (user_id, logro_id) VALUES (?, ?)',
        [userId, logro.id]
      );
    }
  }
}
