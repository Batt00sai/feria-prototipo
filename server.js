const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DeleteCommand, DynamoDBDocumentClient, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const port = Number(process.env.PORT) || 3000;
const tableName = process.env.DYNAMODB_TABLE;
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const dynamo = tableName
  ? DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }))
  : null;
const publicDir = __dirname;
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "visitantes.json");
const intentosPorIp = new Map();
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
  if (dynamo) {
    const respuesta = await dynamo.send(new ScanCommand({ TableName: tableName }));
    return (respuesta.Items || []).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }

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

async function guardarRegistro(registro) {
  if (dynamo) {
    await dynamo.send(new PutCommand({ TableName: tableName, Item: registro }));
    return;
  }

  const registros = await leerRegistros();
  registros.push(registro);
  await guardarRegistros(registros);
}

async function eliminarRegistro(id) {
  if (dynamo) {
    await dynamo.send(new DeleteCommand({ TableName: tableName, Key: { id } }));
    return;
  }

  const registros = await leerRegistros();
  await guardarRegistros(registros.filter((registro) => String(registro.id) !== id));
}

function normalizarTelefono(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function obtenerIp(peticion) {
  const encabezado = peticion.headers["x-forwarded-for"] || "";
  if (encabezado) {
    return String(encabezado).split(",")[0].trim();
  }

  return (peticion.socket && peticion.socket.remoteAddress) ? String(peticion.socket.remoteAddress) : "desconocida";
}

function validarPeticionRegistro({ nombre, empresa, telefono }) {
  const nombreLimpio = String(nombre || "").trim();
  const empresaLimpia = String(empresa || "").trim();
  const telefonoLimpio = normalizarTelefono(telefono);

  if (!nombreLimpio || !empresaLimpia || !telefonoLimpio) {
    return "Faltan datos obligatorios.";
  }

  if (telefonoLimpio.length < 10 || telefonoLimpio.length > 15) {
    return "Ingresa un teléfono válido con 10 a 15 dígitos.";
  }

  return "";
}

function bloquearSpamIp(ip) {
  const ahora = Date.now();
  const historial = intentosPorIp.get(ip) || [];
  const recientes = historial.filter((tiempo) => ahora - tiempo < 60000);
  recientes.push(ahora);
  intentosPorIp.set(ip, recientes);
  return recientes.length > 3;
}

function responderJson(respuesta, estado, datos) {
  respuesta.writeHead(estado, { "Content-Type": "application/json; charset=utf-8" });
  respuesta.end(estado === 204 ? "" : JSON.stringify(datos));
}

function crearSesion() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 30 * 60 * 1000 })).toString("base64url");
  const firma = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${firma}`;
}

function tieneSesionValida(peticion) {
  const cookies = String(peticion.headers.cookie || "");
  const coincidencia = cookies.match(/(?:^|;\s*)metersit_session=([^;]+)/);
  if (!coincidencia) return false;

  const [payload, firma] = coincidencia[1].split(".");
  if (!payload || !firma) return false;

  const firmaEsperada = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  if (firma.length !== firmaEsperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(firmaEsperada))) {
    return false;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).exp > Date.now();
  } catch (error) {
    return false;
  }
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
      const ip = obtenerIp(peticion);

      if (bloquearSpamIp(ip)) {
        responderJson(respuesta, 429, { error: "Demasiados intentos. Intenta nuevamente en unos minutos." });
        return;
      }

      const errorValidacion = validarPeticionRegistro({ nombre, empresa, telefono });
      if (errorValidacion) {
        responderJson(respuesta, 400, { error: errorValidacion });
        return;
      }

      const registros = await leerRegistros();
      const telefonoNormalizado = normalizarTelefono(telefono);
      const yaExiste = registros.some((registro) => normalizarTelefono(registro.telefono) === telefonoNormalizado);
      if (yaExiste) {
        responderJson(respuesta, 409, { error: "Este teléfono ya fue registrado." });
        return;
      }

      const registro = {
        id: crypto.randomUUID(),
        nombre,
        empresa,
        telefono: telefonoNormalizado,
        fecha: new Date().toISOString()
      };
      await guardarRegistro(registro);
      respuesta.setHeader("Set-Cookie", "metersit_session=" + crearSesion() + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=1800");
      responderJson(respuesta, 201, registro);
    } catch (error) {
      responderJson(respuesta, 400, { error: "El registro no es válido" });
    }
    return;
  }

  if (url.pathname.startsWith("/api/visitantes/") && peticion.method === "DELETE") {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    await eliminarRegistro(id);
    responderJson(respuesta, 204, null);
    return;
  }

  if (peticion.method === "GET") {
    if (url.pathname === "/presentacion.html" && !tieneSesionValida(peticion)) {
      respuesta.writeHead(302, { Location: "/index.html" });
      respuesta.end();
      return;
    }
    await servirArchivo(url.pathname, respuesta);
    return;
  }

  respuesta.writeHead(405);
  respuesta.end("Método no permitido");
});

servidor.listen(port, "0.0.0.0", () => {
  console.log(`MeteRSit disponible en el puerto ${port}`);
});
