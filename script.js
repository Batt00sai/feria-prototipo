// Esperamos a que la página cargue completamente
document.addEventListener("DOMContentLoaded", function () {

  /* ==========================================
     1) VALIDACIÓN DEL FORMULARIO (index.html)
     ========================================== */
  const formulario = document.getElementById("formularioRegistro");
  const botonEntrar = document.getElementById("botonEntrar");
  const bienvenida = document.getElementById("bienvenida");
  const registro = document.getElementById("registro");

  if (botonEntrar && bienvenida && registro) {
    botonEntrar.addEventListener("click", function () {
      bienvenida.classList.add("etapa-saliente");
      registro.classList.remove("etapa-oculta");
      registro.classList.add("etapa-activa");
    });
  }

  if (formulario) {
    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault(); // Evita el envío tradicional del formulario

      const nombre = document.getElementById("nombre").value.trim();
      const empresa = document.getElementById("empresa").value.trim();
      const telefono = document.getElementById("telefono").value.trim();

      let formularioValido = true;

      if (nombre === "") {
        mostrarError("error-nombre", "Por favor ingresa tu nombre.");
        formularioValido = false;
      } else {
        mostrarError("error-nombre", "");
      }

      if (empresa === "") {
        mostrarError("error-empresa", "Por favor ingresa tu empresa.");
        formularioValido = false;
      } else {
        mostrarError("error-empresa", "");
      }

      if (telefono === "") {
        mostrarError("error-telefono", "Por favor ingresa tu teléfono.");
        formularioValido = false;
      } else {
        mostrarError("error-telefono", "");
      }

      // Si todo está completo → redirigir a la presentación
      if (formularioValido) {
        const registros = JSON.parse(localStorage.getItem("metersitVisitantes") || "[]");
        registros.push({
          id: Date.now(),
          nombre: nombre,
          empresa: empresa,
          telefono: telefono,
          fecha: new Date().toISOString()
        });
        localStorage.setItem("metersitVisitantes", JSON.stringify(registros));
        window.location.href = "presentacion.html";
      }
    });

    function mostrarError(idElemento, mensaje) {
      document.getElementById(idElemento).textContent = mensaje;
    }
  }

  /* ==========================================
     2) ANIMACIÓN DE APARICIÓN AL HACER SCROLL
        (presentacion.html)
     ========================================== */
  const elementosRevelar = document.querySelectorAll(".reveal");

  if (elementosRevelar.length > 0) {
    const observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("visible");
          observador.unobserve(entrada.target); // animar solo una vez
        }
      });
    }, { threshold: 0.15 });

    elementosRevelar.forEach(function (el) {
      observador.observe(el);
    });
  }

  /* ==========================================
     3) CONTADORES ANIMADOS DE CIFRAS
        (presentacion.html)
     ========================================== */
  const numeros = document.querySelectorAll(".numero");

  if (numeros.length > 0) {
    const observadorNumeros = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          animarContador(entrada.target);
          observadorNumeros.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.5 });

    numeros.forEach(function (numero) {
      observadorNumeros.observe(numero);
    });

    function animarContador(elemento) {
      const objetivo = parseInt(elemento.dataset.objetivo, 10);
      const duracion = 1500; // milisegundos
      const inicio = performance.now();

      function actualizar(ahora) {
        const progreso = Math.min((ahora - inicio) / duracion, 1);
        const valorActual = Math.floor(progreso * objetivo);
        elemento.textContent = valorActual.toLocaleString("es-CO") + (progreso === 1 ? "+" : "");
        if (progreso < 1) {
          requestAnimationFrame(actualizar);
        }
      }

      requestAnimationFrame(actualizar);
    }
  }

  /* ==========================================
     4) SIMULADOR PÚBLICO DE CONSUMO
     ========================================== */
  const nivelConsumo = document.getElementById("nivelConsumo");

  if (nivelConsumo) {
    const valorConsumo = document.getElementById("valorConsumo");
    const barraConsumo = document.getElementById("barraConsumo");
    const consumoEstimado = document.getElementById("consumoEstimado");
    const ahorroPotencial = document.getElementById("ahorroPotencial");
    const estadoConsumo = document.getElementById("estadoConsumo");
    const valorSensor = document.getElementById("valorSensor");
    const barraSensor = document.getElementById("barraSensor");

    function actualizarSimulador() {
      const nivel = Number(nivelConsumo.value);
      const ahorro = Math.max(5, 35 - Math.round(nivel * 0.2));
      valorConsumo.textContent = nivel + "%";
      barraConsumo.style.width = nivel + "%";
      consumoEstimado.textContent = nivel + " kWh";
      ahorroPotencial.textContent = ahorro + "%";
      estadoConsumo.textContent = nivel < 40 ? "Eficiente" : nivel > 75 ? "Revisar" : "Equilibrado";
      estadoConsumo.dataset.estado = nivel < 40 ? "eficiente" : nivel > 75 ? "revisar" : "equilibrado";
      if (valorSensor && barraSensor) {
        valorSensor.textContent = nivel;
        barraSensor.style.width = nivel + "%";
      }
    }

    nivelConsumo.addEventListener("input", actualizarSimulador);
    actualizarSimulador();
  }

  /* ==========================================
     5) DASHBOARD LOCAL DE VISITANTES
     ========================================== */
  const tablaVisitantes = document.getElementById("tablaVisitantes");

  if (tablaVisitantes) {
    const buscador = document.getElementById("buscadorVisitantes");
    const estadoVacio = document.getElementById("estadoVacio");
    const totalVisitantes = document.getElementById("totalVisitantes");
    const totalEmpresas = document.getElementById("totalEmpresas");
    const ultimoRegistro = document.getElementById("ultimoRegistro");
    let registros = leerRegistros();

    function leerRegistros() {
      try {
        return JSON.parse(localStorage.getItem("metersitVisitantes") || "[]");
      } catch (error) {
        return [];
      }
    }

    function pintarDashboard() {
      const termino = buscador.value.trim().toLowerCase();
      const filtrados = registros.filter(function (registro) {
        return [registro.nombre, registro.empresa, registro.telefono].some(function (dato) {
          return dato.toLowerCase().includes(termino);
        });
      });

      totalVisitantes.textContent = registros.length;
      totalEmpresas.textContent = new Set(registros.map(function (registro) {
        return registro.empresa.toLowerCase();
      })).size;
      ultimoRegistro.textContent = registros.length > 0 ? formatearFecha(registros[registros.length - 1].fecha) : "--";
      tablaVisitantes.innerHTML = "";
      estadoVacio.hidden = filtrados.length > 0;
      estadoVacio.textContent = registros.length === 0 ? "Todavía no hay visitantes registrados." : "No encontramos coincidencias.";

      filtrados.slice().reverse().forEach(function (registro) {
        const fila = document.createElement("tr");
        fila.innerHTML = "<td>" + escaparHtml(registro.nombre) + "</td>" +
          "<td>" + escaparHtml(registro.empresa) + "</td>" +
          "<td>" + escaparHtml(registro.telefono) + "</td>" +
          "<td>" + formatearFecha(registro.fecha) + "</td>" +
          "<td><button class=\"boton-eliminar-registro\" type=\"button\" data-id=\"" + registro.id + "\">Eliminar</button></td>";
        tablaVisitantes.appendChild(fila);
      });
    }

    function formatearFecha(fecha) {
      return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(new Date(fecha));
    }

    function escaparHtml(valor) {
      return valor.replace(/[&<>\"']/g, function (caracter) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[caracter];
      });
    }

    buscador.addEventListener("input", pintarDashboard);
    tablaVisitantes.addEventListener("click", function (evento) {
      const boton = evento.target.closest("[data-id]");
      if (!boton) return;
      registros = registros.filter(function (registro) {
        return String(registro.id) !== boton.dataset.id;
      });
      localStorage.setItem("metersitVisitantes", JSON.stringify(registros));
      pintarDashboard();
    });

    document.getElementById("exportarCsv").addEventListener("click", function () {
      const encabezados = ["Nombre", "Empresa", "Telefono", "Fecha y hora"];
      const filas = registros.map(function (registro) {
        return [registro.nombre, registro.empresa, registro.telefono, formatearFecha(registro.fecha)];
      });
      const csv = [encabezados, ...filas].map(function (fila) {
        return fila.map(function (valor) { return '"' + String(valor).replace(/"/g, '""') + '"'; }).join(",");
      }).join("\n");
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
      enlace.download = "metersit-visitantes.csv";
      enlace.click();
      URL.revokeObjectURL(enlace.href);
    });

    pintarDashboard();
  }
});
