// dashboard.js (reemplazar tu archivo actual)
document.addEventListener("DOMContentLoaded", async () => {
  // Elementos (guardias para no romper si alguna página no tiene todo)
  const saludo = document.getElementById("saludo-usuario");
  const fraseEl = document.getElementById("frase-motivadora");
  const lista = document.getElementById("lista");
  const newHabitForm = document.getElementById("newHabitForm");
  const habitDetail = document.getElementById("habit-detail");
  const habitNameEl = document.getElementById("habit-name");
  const logForm = document.getElementById("logForm");
  const fechaInput = document.getElementById("fecha");
  const minutosInput = document.getElementById("minutos");
  const streakEl = document.getElementById("streak");
  const backBtn = document.getElementById("backBtn");
  const graficaGeneralCanvas = document.getElementById("grafica-habito");
  const imcEl = document.getElementById("imc-dashboard");
  const fechaRapida = document.getElementById("fecha-log");
  const minutosRapidos = document.getElementById("minutos-log");
  const btnRegistrarRapido = document.getElementById("btn-registrar");
  const logrosHabitoEl = document.getElementById("logros-habito");
  const mascota = document.getElementById("mascota");
  const mensajeMascota = document.getElementById("mensaje-mascota");
  const novaMensaje = document.getElementById("nova-mensaje");

  let currentHabitId = null;
  let chartInstance = null;      // detalle del hábito
  let graficaGeneral = null;     // gráfica combinada

  // Frases motivadoras
  const frases = [
    "Cada minuto cuenta.",
    "Tu constancia está dejando huella.",
    "La disciplina vence a la duda.",
    "¡Hoy es un gran día para avanzar!",
    "Tu esfuerzo silencioso crea resultados ruidosos.",
    "Pequeños pasos, gran progreso.",
    "Tu rutina construye tu mejor versión."
  ];

  // Fecha por defecto hoy
  if (fechaInput) fechaInput.value = new Date().toISOString().slice(0, 10);
  if (fechaRapida) fechaRapida.value = new Date().toISOString().slice(0, 10);

  // Cargar usuario
  try {
    const res = await fetch("/me");
    if (res.ok) {
      const user = await res.json();
      if (saludo) saludo.textContent = `¡Bienvenido, ${user.nombre}!`;
      if (fraseEl) fraseEl.textContent = frases[Math.floor(Math.random() * frases.length)];
    } else {
      // Si la ruta /me devuelve 401 o similar, manda a login
      window.location.href = "/login.html";
    }
  } catch (err) {
    console.error("Error al obtener datos del usuario:", err);
  }

  // Cargar IMC
  try {
    const sres = await fetch("/salud");
    if (sres.ok) {
      const sdata = await sres.json();
      if (imcEl) imcEl.textContent = sdata.imc ?? "–";
    }
  } catch (e) {
    console.warn("No se pudo cargar el IMC");
  }

  // Cargar hábitos
  async function loadHabits() {
    try {
      const res = await fetch("/api/habits");
      if (!res.ok) {
        if (lista) lista.innerText = "Error cargando hábitos";
        return;
      }
      const habits = await res.json();
      if (lista) lista.innerHTML = "";

      // Panel resumen (guards)
      const totalEl = document.getElementById("total-habitos");
      const rachaMaxEl = document.getElementById("racha-max");
      const minutosSemanaEl = document.getElementById("minutos-semana");
      const completadosHoyEl = document.getElementById("completados-hoy");

      if (totalEl) totalEl.textContent = String(habits.length);
      const rachas = habits.map(h => h.racha || 0);
      const maxRacha = rachas.length ? Math.max(...rachas) : 0;
      if (rachaMaxEl) rachaMaxEl.textContent = `${maxRacha} días`;

      const minutosSemana = habits.reduce((acc, h) => acc + (h.minutos_semana || 0), 0);
      if (minutosSemanaEl) minutosSemanaEl.textContent = String(minutosSemana);

      const completadosHoy = habits.reduce((acc, h) => acc + (h.completado_hoy ? 1 : 0), 0);
      if (completadosHoyEl) completadosHoyEl.textContent = String(completadosHoy);

      // Tarjetas de hábitos
      for (const h of habits) {
        const div = document.createElement("div");
        div.className = "habit-item";
        div.innerHTML = `<strong>${h.nombre}</strong> — ${h.periodo} — objetivo: ${h.objetivo_minutos_per ?? 0} min
          <button data-id="${h.id}" data-name="${h.nombre}">Abrir</button>`;
        if (lista) lista.appendChild(div);
      }

      // Botones abrir
      if (lista) {
        lista.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", () => openHabit(btn.dataset.id, btn.dataset.name));
        });
      }

      // Gráfica general
      await mostrarGraficaGeneral(habits.map(h => h.id));
    } catch (err) {
      console.error("loadHabits error:", err);
    }
  }

  // Crear hábito
  if (newHabitForm) {
    newHabitForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(newHabitForm);
      const body = Object.fromEntries(fd);
      try {
        await fetch("/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        newHabitForm.reset();
        reaccionMascota("¡Nuevo hábito creado! 🎉");
        await loadHabits();
      } catch (err) {
        console.error("Error creando hábito:", err);
      }
    });
  }

  // Abrir detalle
  async function openHabit(id, name) {
    currentHabitId = id;
    if (habitNameEl) habitNameEl.textContent = name || "";
    const listSection = document.getElementById("habits-list");
    if (listSection) listSection.style.display = "none";
    if (habitDetail) habitDetail.style.display = "block";
    if (fraseEl) fraseEl.textContent = frases[Math.floor(Math.random() * frases.length)];
    await loadHabitStats(id);
    consejoNova(streakEl ? streakEl.textContent : 0);
  }

  // Volver al listado
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (habitDetail) habitDetail.style.display = "none";
      const listSection = document.getElementById("habits-list");
      if (listSection) listSection.style.display = "block";
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    });
  }

  // Registrar en detalle
  if (logForm) {
    logForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const minutos = +minutosInput.value;
      const fecha = fechaInput.value;
      if (!currentHabitId) return;
      try {
        await fetch(`/habits/${currentHabitId}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutos, fecha })
        });
        await loadHabitStats(currentHabitId);
        reaccionMascota("¡Progreso registrado! 🐾");
      } catch (err) {
        console.error("Error registrando log:", err);
      }
    });
  }

  // Registro rápido
  if (btnRegistrarRapido) {
    btnRegistrarRapido.addEventListener("click", async () => {
      const minutos = +minutosRapidos.value || 0;
      const fecha = fechaRapida.value;
      if (!minutos) return;
      try {
        const res = await fetch("/api/habits");
        if (!res.ok) return;
        const habits = await res.json();
        if (!habits.length) return;
        const principal = habits[0];
        await fetch(`/habits/${principal.id}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutos, fecha })
        });
        reaccionMascota(`+${minutos} min a ${principal.nombre}`);
        minutosRapidos.value = "";
        await loadHabits();
      } catch (err) {
        console.error("Registro rápido error:", err);
      }
    });
  }

  // Stats del hábito 
  async function loadHabitStats(id) {
    try {
      const res = await fetch(`/api/habits/${id}/summary`);
      if (!res.ok) return;
      const data = await res.json();
      if (streakEl) streakEl.textContent = String(data.streak ?? 0);

      // Logros por racha
      if (logrosHabitoEl) {
        logrosHabitoEl.innerHTML = "";
        if (data.streak >= 7) logrosHabitoEl.innerHTML += `<p>🏆 ¡Racha de 7 días!</p>`;
        if (data.streak >= 14) logrosHabitoEl.innerHTML += `<p>🏆 ¡Racha de 14 días!</p>`;
        if (data.streak >= 30) logrosHabitoEl.innerHTML += `<p>🏆 ¡Racha de 30 días!</p>`;
      }

      // Normalizar labels (asegura que la fecha sea YYYY-MM-DD)
      const normalizeDate = d => {
        const date = (typeof d === "string" || d instanceof String) ? new Date(d) : d;
        return date instanceof Date && !isNaN(date) ? date.toISOString().slice(0,10) : String(d);
      };

      const labels = (data.rows || []).map(r => normalizeDate(r.fecha));
      const mins = (data.rows || []).map(r => r.minutos || 0);

      const canvas = document.getElementById("habit-chart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Minutos",
            data: mins,
            backgroundColor: mins.length > 10 ? "rgba(71,184,255,0.6)" : "rgba(243,156,18,0.6)"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 5 } }
          }
        }
      });
    } catch (err) {
      console.error("loadHabitStats error:", err);
    }
  }

  // Gráfica general combinada (últimos 30 días)
  async function mostrarGraficaGeneral(habitIds = []) {
    try {
      if (!graficaGeneralCanvas) return;
      const hoy = new Date();
      const labelsSet = new Set();
      const series = [];

      // Helper para formatear fechas a YYYY-MM-DD
      const fmt = (d) => {
        const date = new Date(d);
        if (isNaN(date)) return String(d);
        return date.toISOString().slice(0,10);
      };

      for (const id of habitIds) {
        try {
          const res = await fetch(`/habits/${id}/logs`);
          if (!res.ok) continue;
          const registros = await res.json();
          // últimos 30 días
          const ult30 = registros.filter(r => {
            const f = new Date(r.fecha);
            return !isNaN(f) && ((hoy - f) / (1000 * 60 * 60 * 24) <= 30);
          });
          // agregar labels y mapa por fecha (YYYY-MM-DD)
          const mapa = new Map();
          ult30.forEach(r => {
            const key = fmt(r.fecha);
            labelsSet.add(key);
            mapa.set(key, (mapa.get(key) || 0) + (r.minutos || 0));
          });
          series.push({ id, data: mapa });
        } catch (e) {
          console.warn(`No se pudieron traer logs del hábito ${id}`, e);
          continue;
        }
      }

      // ordenar labels cronológicamente
      const labels = Array.from(labelsSet).sort((a,b) => new Date(a) - new Date(b));
      const dataset = [{
        label: "Minutos por día (todos los hábitos)",
        data: labels.map(fecha => series.reduce((sum, s) => sum + (s.data.get(fecha) || 0), 0)),
        backgroundColor: "rgba(71,184,255,0.6)"
      }];

      const ctx = graficaGeneralCanvas.getContext("2d");
      if (graficaGeneral) graficaGeneral.destroy();
      graficaGeneral = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: dataset },
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 5 } }
          }
        }
      });
    } catch (err) {
      console.error("Error al cargar gráfica general:", err);
    }
  }

  // Reacción mascota
  function reaccionMascota(mensaje) {
    if (!mascota || !mensajeMascota) return;
    mascota.classList.add("animar");
    mensajeMascota.textContent = mensaje;
    setTimeout(() => {
      mascota.classList.remove("animar");
      mensajeMascota.textContent = "";
    }, 3000);
  }

  // Consejo Nova
  function consejoNova(streak) {
    if (!novaMensaje) return;
    const s = Number(streak) || 0;
    novaMensaje.textContent = s >= 7
      ? "¡Tu racha es poderosa! ¿Subimos el objetivo?"
      : "Vas bien. No rompas la cadena hoy.";
  }

  // Cargar al inicio
  await loadHabits();
});

//mapa de calor
(function initHeatmap() {
  const prevBtn = document.getElementById('prev-month');
  const nextBtn = document.getElementById('next-month');
  const label = document.getElementById('heatmap-month-label');
  const cellsContainer = document.getElementById('heatmap-cells');
  const tooltip = document.getElementById('heatmap-tooltip');

  if (!prevBtn || !nextBtn || !label || !cellsContainer) return;

  let viewDate = new Date(); // mes visible

  prevBtn.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderHeatmap();
  });
  nextBtn.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderHeatmap();
  });

  async function fetchMonthTotals(year, month) {
    try {
      const resHabits = await fetch('/api/habits');
      if (!resHabits.ok) return new Map();
      const habits = await resHabits.json();

      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);

      const totals = new Map();

      for (let d = 1; d <= end.getDate(); d++) {
        const key = formatDate(new Date(year, month, d));
        totals.set(key, 0);
      }

      for (const h of habits) {
        try {
          const resLogs = await fetch(`/habits/${h.id}/logs`);
          if (!resLogs.ok) continue;
          const logs = await resLogs.json();
          logs.forEach(l => {
            const f = new Date(l.fecha);
            if (f >= start && f <= end) {
              const key = formatDate(f);
              totals.set(key, (totals.get(key) || 0) + (l.minutos || 0));
            }
          });
        } catch (e) {
          console.warn("Error logs hábito en heatmap", e);
        }
      }

      return totals;
    } catch (e) {
      console.error('Heatmap error:', e);
      return new Map();
    }
  }

  function formatMonthLabel(date) {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${meses[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function levelForMinutes(mins) {
    if (mins <= 0) return 0;
    if (mins < 10) return 1;
    if (mins < 25) return 2;
    if (mins < 45) return 3;
    return 4;
  }

  async function renderHeatmap() {
    label.textContent = formatMonthLabel(viewDate);
    cellsContainer.innerHTML = '';

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weekdayIndex = (d) => {
      const jsDay = new Date(year, month, d).getDay(); 
      return jsDay === 0 ? 7 : jsDay; 
    };

    const totals = await fetchMonthTotals(year, month);

    // Rellena las celdas con offset inicial
    const startOffset = weekdayIndex(1) - 1; 
    for (let i = 0; i < startOffset; i++) {
      const spacer = document.createElement('div');
      spacer.style.visibility = 'hidden';
      cellsContainer.appendChild(spacer);
    }

    // Celdas del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const key = formatDate(new Date(year, month, d));
      const mins = totals.get(key) || 0;
      const level = levelForMinutes(mins);

      const cell = document.createElement('div');
      cell.className = `cell level-${level}`;
      cell.dataset.date = key;
      cell.dataset.mins = mins;

      const dayLabel = document.createElement('div');
      dayLabel.className = 'day';
      dayLabel.textContent = d;
      cell.appendChild(dayLabel);

      cell.addEventListener('mousemove', (e) => {
        if (!tooltip) return;
        tooltip.style.display = 'block';
        tooltip.textContent = `${key} — ${mins} min`;
        tooltip.style.top = `${e.clientY + 12}px`;
        tooltip.style.left = `${e.clientX + 12}px`;
      });
      cell.addEventListener('mouseleave', () => {
        if (!tooltip) return;
        tooltip.style.display = 'none';
      });

      // abrir detalle del día en el hábito principal
      cell.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/habits');
          const habits = await res.json();
          if (!habits.length) return;
          const principal = habits[0];
          const dateInput = document.getElementById('fecha');
          if (dateInput) dateInput.value = key;
          const nameEl = document.getElementById('habit-name');
          if (nameEl) nameEl.textContent = principal.nombre;
          const detail = document.getElementById('habit-detail');
          const list = document.getElementById('habits-list');
          if (detail && list) {
            list.style.display = 'none';
            detail.style.display = 'block';
          }
          const msg = document.getElementById('mensaje-mascota');
          if (msg) msg.textContent = `Día seleccionado: ${key} (${mins} min)`;
          setTimeout(() => { if (msg) msg.textContent = ''; }, 2500);
        } catch (e) {
          console.warn("Error al abrir día desde heatmap", e);
        }
      });

      cellsContainer.appendChild(cell);
    }
  }

  renderHeatmap();
})();
//graficas semanales
(async function weeklyCharts() {
  const compCanvas = document.getElementById("chart-general");
  const trendCanvas = document.getElementById("trend-week");
  const toggleTypeBtn = document.getElementById("toggle-type");
  const toggleFillBtn = document.getElementById("toggle-fill");

  if (!compCanvas || !trendCanvas) return;

  let chartCompare = null;
  let chartTrend = null;

  let trendType = "line";  
  let trendFill = false;   

  async function fetchWeeklyData() {
    const resHabits = await fetch("/api/habits");
    const habits = await resHabits.json();

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    const map = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }

    for (const h of habits) {
      const logsRes = await fetch(`/habits/${h.id}/logs`);
      const logs = await logsRes.json();

      logs.forEach(l => {
        const date = new Date(l.fecha);
        if (date >= start && date <= today) {
          const key = date.toISOString().slice(0, 10);
          map.set(key, (map.get(key) || 0) + l.minutos);
        }
      });
    }

    return {
      labels: Array.from(map.keys()),
      values: Array.from(map.values()),
    };
  }

  async function renderCharts() {
    const { labels, values } = await fetchWeeklyData();
    const promedio = values.reduce((a, b) => a + b, 0) / values.length;

    // grafica comparativa semanal
    if (chartCompare) chartCompare.destroy();
    chartCompare = new Chart(compCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Minutos",
            data: values,
            backgroundColor: "rgba(71, 184, 255, 0.6)",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: false },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });

    // grafica de tendencia semanal
    if (chartTrend) chartTrend.destroy();
    chartTrend = new Chart(trendCanvas.getContext("2d"), {
      type: trendType,
      data: {
        labels,
        datasets: [
          {
            label: "Minutos",
            data: values,
            borderWidth: 2,
            tension: 0.35,
            fill: trendFill,
            backgroundColor: "rgba(71, 184, 255, 0.3)",
          },
          {
            label: "Promedio",
            data: labels.map(() => promedio),
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: false },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }
//botones
  if (toggleTypeBtn) {
    toggleTypeBtn.addEventListener("click", () => {
      trendType = trendType === "line" ? "bar" : "line";
      renderCharts();
    });
  }

  if (toggleFillBtn) {
    toggleFillBtn.addEventListener("click", () => {
      trendFill = !trendFill;
      renderCharts();
    });
  }

  await renderCharts();
})();

const fakeLoad = (ms) => new Promise(res => setTimeout(res, ms));

async function loadChart(idSkeleton, idWrap, callback) {
  document.getElementById(idSkeleton).style.display = "block";
  document.getElementById(idWrap).classList.add("hidden");

  await fakeLoad(800); 

  document.getElementById(idSkeleton).style.display = "none";
  document.getElementById(idWrap).classList.remove("hidden");

  callback();
}

//cuadro general
function renderGeneralChart() {
  const ctx = document.getElementById("chart-general");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
      datasets: [{
        label: "Minutos",
        data: [30, 45, 50, 40, 60, 70, 55]
      }]
    }
  });
}

document.getElementById("compare-range").addEventListener("change", () => {
  loadChart("skeleton-general", "chart-general-wrapper", renderGeneralChart);
});

loadChart("skeleton-general", "chart-general-wrapper", renderGeneralChart);


let trendType = "line";
let trendFill = true;

function renderTrendChart() {
  const ctx = document.getElementById("trend-week");

  new Chart(ctx, {
    type: trendType,
    data: {
      labels: ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"],
      datasets: [{
        label: "Progreso",
        data: [20, 30, 45, 50, 48, 70, 60],
        fill: trendFill
      }]
    }
  });
}

document.getElementById("toggle-type").addEventListener("click", () => {
  trendType = trendType === "line" ? "bar" : "line";
  loadChart("skeleton-trend", "trend-wrapper", renderTrendChart);
});

document.getElementById("toggle-fill").addEventListener("click", () => {
  trendFill = !trendFill;
  loadChart("skeleton-trend", "trend-wrapper", renderTrendChart);
});

document.getElementById("trend-range").addEventListener("change", () => {
  loadChart("skeleton-trend", "trend-wrapper", renderTrendChart);
});

loadChart("skeleton-trend", "trend-wrapper", renderTrendChart);
