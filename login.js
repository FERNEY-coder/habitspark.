document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); 

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorBox = document.getElementById("error-message");
    errorBox.style.display = "none";

    if (!email || !password) {
      errorBox.textContent = "Por favor, completa todos los campos.";
      errorBox.style.display = "block";
      return;
    }

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const result = await res.json();

      if (res.ok && result.success && result.redirect) {
        window.location.href = result.redirect;
      } else {
        errorBox.textContent = result.error || "Correo o contraseña incorrectos.";
        errorBox.style.display = "block";
      }
    } catch (err) {
      console.error("Error al conectar con el servidor:", err);
      errorBox.textContent = "Error de conexión. Intenta de nuevo.";
      errorBox.style.display = "block";
    }
  });
});
