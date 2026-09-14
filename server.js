const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const port = Number(process.env.PORT) || 3000;
const publicDir = __dirname;
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "visitantes.json");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

async function leerRegistros() {
  try {
    const registros = JSON.parse(await fs.readFile(dataFile, "utf8"));
    return Array.isArray(registros) ? registros : [];
  } catch (error) {
    return [];
  }
}

async function guardarRegistros(registros) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(registros, null, 2), "utf8");
}

function responderJson(respuesta, estado, datos) {
  respuesta.writeHead(estado, { "Content-Type": "application/json; charset=utf-8" });
  respuesta.end(estado === 204 ? "" : JSON.stringify(datos));
}

function leerCuerpo(peticion) {
  return new Promise((resolve, reject) => {
    let cuerpo = "";
    peticion.on("data", (trozo) => { cuerpo += trozo; });
    peticion.on("end", () => resolve(cuerpo));
    peticion.on("error", reject);
  });
}

async function servirArchivo(ruta, respuesta) {
  const rutaRelativa = ruta === "/" ? "index.html" : ruta.slice(1);
  const archivo = path.resolve(publicDir, rutaRelativa);
  if (!archivo.startsWith(path.resolve(publicDir) + path.sep)) {
    respuesta.writeHead(403);
    respuesta.end("Acceso denegado");
    return;
  }

  try {
    const contenido = await fs.readFile(archivo);
    respuesta.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(archivo).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    respuesta.end(contenido);
  } catch (error) {
    respuesta.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    respuesta.end("Archivo no encontrado");
  }
}

const servidor = http.createServer(async (peticion, respuesta) => {
  const url = new URL(peticion.url, `http://${peticion.headers.host || "localhost"}`);

  if (url.pathname === "/api/visitantes" && peticion.method === "GET") {
    responderJson(respuesta, 200, await leerRegistros());
    return;
  }

  if (url.pathname === "/api/visitantes" && peticion.method === "POST") {
    try {
      const datos = JSON.parse(await leerCuerpo(peticion));
      const nombre = String(datos.nombre || "").trim();
      const empresa = String(datos.empresa || "").trim();
      const telefono = String(datos.telefono || "").trim();
      if (!nombre || !empresa || !telefono) {
        responderJson(respuesta, 400, { error: "Faltan datos obligatorios" });
        return;
      }

      const registro = { id: crypto.randomUUID(), nombre, empresa, telefono, fecha: new Date().toISOString() };
      const registros = await leerRegistros();
      registros.push(registro);
      await guardarRegistros(registros);
      responderJson(respuesta, 201, registro);
    } catch (error) {
      responderJson(respuesta, 400, { error: "El registro no es válido" });
    }
    return;
  }

  if (url.pathname.startsWith("/api/visitantes/") && peticion.method === "DELETE") {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const registros = await leerRegistros();
    await guardarRegistros(registros.filter((registro) => String(registro.id) !== id));
    responderJson(respuesta, 204, null);
    return;
  }

  if (peticion.method === "GET") {
    await servirArchivo(url.pathname, respuesta);
    return;
  }

  respuesta.writeHead(405);
  respuesta.end("Método no permitido");
});

servidor.listen(port, "0.0.0.0", () => {
  console.log(`MeteRSit disponible en el puerto ${port}`);
});
