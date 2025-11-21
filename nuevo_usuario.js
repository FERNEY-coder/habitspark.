document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registerForm");
  const password = document.getElementById("password");
  const confirm = document.getElementById("confirm_password");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Validación de contraseñas
    if (password.value !== confirm.value) {
      alert("Las contraseñas no coinciden. Por favor, verifica e inténtalo de nuevo.");
      confirm.focus();
      return;
    }

    // Recolectar datos del formulario
    const fd = new FormData(form);
    const body = Object.fromEntries(fd);

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Redirección si el registro fue exitoso
        window.location.href = data.redirect || "index.html";
      } else {
        // Mostrar mensaje de error del backend
        alert(data.error || "Error al crear usuario");
      }
    } catch (err) {
      alert("Error de conexión con el servidor");
    }
  });
});
