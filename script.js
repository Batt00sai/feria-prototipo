// Esperamos a que la página cargue completamente
document.addEventListener("DOMContentLoaded", function () {

  /* ==========================================
     1) VALIDACIÓN DEL FORMULARIO (index.html)
     ========================================== */
  const formulario = document.getElementById("formularioRegistro");
  const botonEntrar = document.getElementById("botonEntrar");
  const bienvenida = document.getElementById("bienvenida");
  const registro = document.getElementById("registro");
  const imagenQr = document.getElementById("imagenQr");

  if (imagenQr) {
    const imagenQr = document.getElementById("imagenQr");
    const estadoQr = document.getElementById("estadoQr");
    const descargarQr = document.getElementById("descargarQr");
 
    const hostQr = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
      ? "35.170.67.193"
      : window.location.hostname;

    const destino = new URL(window.location.origin || "http://35.170.67.193:3000");
    destino.protocol = "http:";
    destino.hostname = hostQr;
    destino.port = "3000";
    destino.pathname = "/";

    if (!/^https?:$/.test(destino.protocol)) {
      estadoQr.textContent = "Publica la aplicación para generar el QR compartible.";
    } else {
      const urlApi = "https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&format=png&data=" + encodeURIComponent(destino.href);
      imagenQr.src = urlApi;
      imagenQr.onload = function () {
        descargarQr.href = urlApi;
        descargarQr.download = "metersit-qr.png";
        descargarQr.hidden = false;
        estadoQr.textContent = "QR único listo para descargar e imprimir.";
      };
      imagenQr.onerror = function () {
        estadoQr.textContent = "No se pudo cargar el QR. Revisa tu conexión a internet.";
      };
    }
  }

  if (botonEntrar && bienvenida && registro) {
    botonEntrar.addEventListener("click", function () {
      bienvenida.classList.add("etapa-saliente");
      registro.classList.remove("etapa-oculta");
      registro.classList.add("etapa-activa");
    });
  }

  if (formulario) {
    formulario.addEventListener("submit", async function (evento) {
      evento.preventDefault(); // Evita el envío tradicional del formulario

      const nombre = document.getElementById("nombre").value.trim();
      const empresa = document.getElementById("empresa").value.trim();
      const telefono = document.getElementById("telefono").value.trim();
      const telefonoLimpio = telefono.replace(/\D/g, "");

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
      } else if (!/^\d{10,15}$/.test(telefonoLimpio)) {
        mostrarError("error-telefono", "Ingresa un teléfono válido con 10 a 15 dígitos.");
        formularioValido = false;
      } else {
        mostrarError("error-telefono", "");
      }

      // Si todo está completo → redirigir a la presentación
      if (formularioValido) {
        const registroVisitante = {
          id: Date.now(),
          nombre: nombre,
          empresa: empresa,
          telefono: telefonoLimpio,
          fecha: new Date().toISOString()
        };

        try {
          const respuesta = await fetch("/api/visitantes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registroVisitante)
          });

          if (!respuesta.ok) {
            const errorData = await respuesta.json().catch(() => ({}));
            mostrarError("error-telefono", errorData.error || "No se pudo completar el registro.");
            return;
          }

          window.location.href = "presentacion.html";
        } catch (error) {
          mostrarError("error-telefono", "No se pudo conectar con el servidor. Intenta nuevamente.");
        }
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
     5) EXPLORADOR DEL MEDIDOR Y MODELOS
     ========================================== */
  const modelos = {
    "G1.6": ["0.016 – 2.5 m³/h", "1.5", "72 días"],
    "G4": ["0.04 – 6.0 m³/h", "1.5", "72 días"],
    "G6": ["0.06 – 10 m³/h", "1.5", "72 días"],
    "G10": ["0.1 – 16 m³/h", "1.5", "72 días"],
    "G16": ["0.16 – 25 m³/h", "1.5", "72 días"],
    "G25": ["0.25 – 40 m³/h", "1.5", "72 días"]
  };
  const botonesModelo = document.querySelectorAll(".modelo-medidor");

  if (botonesModelo.length > 0) {
    const modeloSeleccionado = document.getElementById("modeloSeleccionado");
    const rangoModelo = document.getElementById("rangoModelo");
    const claseModelo = document.getElementById("claseModelo");
    const registrosModelo = document.getElementById("registrosModelo");

    botonesModelo.forEach(function (boton) {
      boton.addEventListener("click", function () {
        const datos = modelos[boton.dataset.modelo];
        botonesModelo.forEach(function (modelo) { modelo.classList.remove("activo"); });
        boton.classList.add("activo");
        modeloSeleccionado.textContent = boton.dataset.modelo;
        rangoModelo.textContent = datos[0];
        claseModelo.textContent = datos[1];
        registrosModelo.textContent = datos[2];
      });
    });
  }

  const puntosMedidor = document.querySelectorAll(".punto-medidor");
  const detallesMedidor = {
    "Pantalla": "Muestra la lectura actual de consumo de forma clara y directa.",
    "Antena": "Permite enviar los datos del medidor para su consulta remota.",
    "Botón azul": "Acceso a la información del usuario y sus lecturas.",
    "Botón naranja": "Navegación rápida entre funciones del equipo.",
    "Puerto óptico": "Conecta con el medidor localmente para diagnóstico y configuración."
  };

  if (puntosMedidor.length > 0) {
    const detalleTitulo = document.getElementById("detalleTitulo");
    const detalleTexto = document.getElementById("detalleTexto");

    puntosMedidor.forEach(function (punto) {
      punto.addEventListener("click", function () {
        puntosMedidor.forEach(function (elemento) { elemento.classList.remove("seleccionado"); });
        punto.classList.add("seleccionado");
        detalleTitulo.textContent = punto.dataset.detalle;
        detalleTexto.textContent = detallesMedidor[punto.dataset.detalle];
      });
    });
  }

  /* ==========================================
     6) DASHBOARD LOCAL DE VISITANTES
     ========================================== */
  const tablaVisitantes = document.getElementById("tablaVisitantes");

  if (tablaVisitantes) {
    const buscador = document.getElementById("buscadorVisitantes");
    const estadoVacio = document.getElementById("estadoVacio");
    const totalVisitantes = document.getElementById("totalVisitantes");
    const totalEmpresas = document.getElementById("totalEmpresas");
    const ultimoRegistro = document.getElementById("ultimoRegistro");
    let registros = [];

    async function leerRegistros() {
      try {
        const respuesta = await fetch("/api/visitantes");
        if (respuesta.ok) return normalizarRegistros(await respuesta.json());
      } catch (error) {
        // Usa los datos locales cuando la página se abre sin servidor.
      }

      try {
        const datos = JSON.parse(localStorage.getItem("metersitVisitantes") || "[]");
        return normalizarRegistros(Array.isArray(datos) ? datos.filter(function (registro) {
          return registro && typeof registro === "object";
        }) : []);
      } catch (error) {
        return [];
      }
    }

    function normalizarRegistros(datos) {
      return datos.map(function (registro) {
          return {
            id: registro.id || Date.now() + Math.random(),
            nombre: String(registro.nombre || ""),
            empresa: String(registro.empresa || ""),
            telefono: String(registro.telefono || ""),
            fecha: registro.fecha || ""
          };
        });
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
      const fechaValida = new Date(fecha);
      return Number.isNaN(fechaValida.getTime())
        ? "Sin fecha"
        : new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(fechaValida);
    }

    function escaparHtml(valor) {
      return String(valor).replace(/[&<>\"']/g, function (caracter) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[caracter];
      });
    }

    buscador.addEventListener("input", pintarDashboard);
    tablaVisitantes.addEventListener("click", async function (evento) {
      const boton = evento.target.closest("[data-id]");
      if (!boton) return;
      registros = registros.filter(function (registro) {
        return String(registro.id) !== boton.dataset.id;
      });
      try {
        await fetch("/api/visitantes/" + encodeURIComponent(boton.dataset.id), { method: "DELETE" });
      } catch (error) {
        localStorage.setItem("metersitVisitantes", JSON.stringify(registros));
      }
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

    leerRegistros().then(function (datos) {
      registros = datos;
      pintarDashboard();
    });
  }
});
