document.addEventListener("DOMContentLoaded", () => {
  cargarSalud();
  configurarEventos();
});

/* --------------------- */
/* CARGAR DATOS DESDE BACKEND */
/* --------------------- */

async function cargarSalud() {
  try {
    const res = await fetch("/salud");
    const data = await res.json();

    document.getElementById("altura").value = data.altura_cm || "";
    document.getElementById("peso").value = data.peso_kg || "";
    document.getElementById("imc").value = data.imc || "";
    document.getElementById("altura-perfil").textContent = data.altura_cm || "–";
    document.getElementById("peso-perfil").textContent = data.peso_kg || "–";
    document.getElementById("imc-perfil").textContent = data.imc || "–";

    actualizarIMCBarra(data.imc);
  } catch (e) {
    console.log("Error cargando salud", e);
  }
}

/* --------------------- */
/* EVENTOS */
/* --------------------- */

function configurarEventos() {
  document.getElementById("calcular-imc").addEventListener("click", calcularIMC);

  document.getElementById("agregar-agua").addEventListener("click", () => {
    let contador = parseInt(localStorage.getItem("agua") || "0");
    contador++;
    localStorage.setItem("agua", contador);
    document.getElementById("agua-contador").textContent = contador;
  });

  document.getElementById("agua-contador").textContent =
    localStorage.getItem("agua") || "0";

  document.getElementById("guardar-sueno").addEventListener("click", () => {
    const horas = document.getElementById("horas-sueno").value;
    localStorage.setItem("sueno", horas);
  });
}

/* --------------------- */
/* CALCULAR IMC */
/* --------------------- */

function calcularIMC() {
  const altura = parseFloat(document.getElementById("altura").value) / 100;
  const peso = parseFloat(document.getElementById("peso").value);

  if (!(altura > 0 && peso > 0)) {
    document.getElementById("imc").value = "Datos inválidos";
    return;
  }

  const imc = peso / (altura * altura);
  const imcFixed = imc.toFixed(2);

  document.getElementById("imc").value = imcFixed;

  actualizarIMCBarra(imcFixed);
  guardarSalud(peso, imcFixed);
}

/* --------------------- */
/* BARRA DE IMC */
/* --------------------- */

function actualizarIMCBarra(imc) {
  const barra = document.getElementById("barra-imc-fill");
  const estado = document.getElementById("imc-estado");

  if (!imc || isNaN(imc)) return;

  const valor = Math.min(Math.max((imc / 40) * 100, 0), 100);
  barra.style.width = valor + "%";

  if (imc < 18.5) {
    barra.style.background = "var(--warning)";
    estado.textContent = "Estado: Bajo peso";
  } else if (imc < 25) {
    barra.style.background = "var(--success)";
    estado.textContent = "Estado: Normal";
  } else if (imc < 30) {
    barra.style.background = "var(--warning)";
    estado.textContent = "Estado: Sobrepeso";
  } else {
    barra.style.background = "var(--danger)";
    estado.textContent = "Estado: Obesidad";
  }
}

/* --------------------- */
/* GUARDAR EN BACKEND */
/* --------------------- */

async function guardarSalud(peso, imc) {
  try {
    await fetch("/salud/actualizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peso_kg: peso, imc })
    });
  } catch (e) {
    console.log("Error guardando salud", e);
  }
}
