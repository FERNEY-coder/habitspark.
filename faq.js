//seccion preguntas
document.addEventListener("DOMContentLoaded", () => {
  const mascota = document.getElementById("mascota");
  const faq = document.getElementById("faq");
  const cerrar = document.getElementById("cerrarFaq");

  if (!mascota || !faq || !cerrar) return;

  mascota.addEventListener("click", () => {
    faq.classList.add("active");
    faq.setAttribute("aria-hidden", "false");
  });

  cerrar.addEventListener("click", () => {
    faq.classList.remove("active");
    faq.setAttribute("aria-hidden", "true");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && faq.classList.contains("active")) {
      faq.classList.remove("active");
      faq.setAttribute("aria-hidden", "true");
    }
  });

  document.addEventListener("click", (e) => {
    const clickDentro = faq.contains(e.target) || mascota.contains(e.target);
    if (!clickDentro && faq.classList.contains("active")) {
      faq.classList.remove("active");
      faq.setAttribute("aria-hidden", "true");
    }
  });
});
