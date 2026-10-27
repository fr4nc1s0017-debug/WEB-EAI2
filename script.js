// Panel web independiente: configura la URL externa de la API desde la interfaz.
// El Arduino usa x-api-key. El navegador usa SOLO x-admin-key.
const API_POR_DEFECTO = '';
const RUTA_COMANDO = '/comando';
const RUTA_MODO = '/modo';
const RUTA_DISTANCIA = '/distancia';
const INTERVALO_MS = 1000;
const TIMEOUT_MS = 4500;
const DISTANCIA_PELIGRO = 20;
const DISTANCIA_PRECAUCION = 50;
const DISTANCIA_MAX = 200;
const CLAVE_URL = 'robot_api_url';
const CLAVE_ADMIN = 'robot_admin_sesion';

const $ = id => document.getElementById(id);
const display = $('display');
const relleno = $('relleno');
const proximidad = $('proximidad');
const punto = $('punto');
const textoEstado = $('textoEstado');
const ultimoComando = $('ultimoComando');
const btnManual = $('btnManual');
const btnAuto = $('btnAuto');
const etiquetaModo = $('etiquetaModo');
const controles = $('controles');
const botonesMovimiento = document.querySelectorAll('[data-mov]');
const botonesComando = document.querySelectorAll('[data-accion]');
const formConfig = $('formConfig');
const inputUrl = $('inputUrl');
const inputClave = $('inputClave');
const btnVerClave = $('btnVerClave');
const btnProbar = $('btnProbar');
const btnBorrar = $('btnBorrar');
const configMensaje = $('configMensaje');
const estadoMotor = $('estadoMotor');
const estadoPendiente = $('estadoPendiente');

let modo = 'manual';
let apiBase = '';
let apiClave = '';
let arduinoEnLinea = false;
let comandoPendiente = null;
let timerConsulta = null;
let enConsulta = false;

function leerLocal(key) {try {return localStorage.getItem(key) || '';} catch (_) {return '';}}
function guardarLocal(key,v) {try {localStorage.setItem(key,v);return true;} catch (_) {return false;}}
function borrarLocal(key) {try {localStorage.removeItem(key);} catch (_) {}}
function leerSesion(key) {try {return sessionStorage.getItem(key) || '';} catch (_) {return '';}}
function guardarSesion(key,v) {try {sessionStorage.setItem(key,v);return true;} catch (_) {return false;}}
function borrarSesion(key) {try {sessionStorage.removeItem(key);} catch (_) {}}

function setEstado(tipo, texto) {
  punto.className = `punto ${tipo}`;
  textoEstado.textContent = texto;
}
function mensajeConfig(tipo, texto) {
  configMensaje.className = `config-mensaje ${tipo}`;
  configMensaje.textContent = texto;
}
function normalizarUrl(url) {return url.trim().replace(/\/+$/, '');}
function urlValida(url) {
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') &&
      u.username === '' && u.password === '' &&
      u.pathname.endsWith('/api') && !u.search && !u.hash;
  } catch (_) {return false;}
}
function bloqueoContenidoMixto(url) {
  return location.protocol === 'https:' && url.startsWith('http://');
}
function configurada() {
  if (!apiBase) {setEstado('error','Configura la URL de la API');return false;}
  if (!apiClave) {setEstado('aviso','Introduce la clave administrativa');return false;}
  return true;
}

async function peticion(ruta, opciones={}, base=apiBase, clave=apiClave) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = {...(opciones.headers || {}), 'x-admin-key': clave};
    const resp = await fetch(base + ruta, {...opciones, headers, cache:'no-store', signal:controller.signal});
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const err = new Error(data.error || `HTTP ${resp.status}`);
      err.status = resp.status;
      throw err;
    }
    return data;
  } finally {clearTimeout(timer);}
}
function enviarJSON(ruta, body) {
  return peticion(ruta, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
}
function aplicarModo(m) {
  modo = m;
  const auto = modo === 'automatico';
  btnManual.classList.toggle('activo', !auto);
  btnAuto.classList.toggle('activo', auto);
  etiquetaModo.textContent = 'Modo confirmado: ' + (auto ? 'AUTOMÁTICO' : 'MANUAL');
  controles.classList.toggle('bloqueado',auto);
  botonesMovimiento.forEach(b => {b.disabled = auto || !arduinoEnLinea || Boolean(comandoPendiente);});
  botonesComando.forEach(b => {
    if (b.dataset.accion === 'detener') b.disabled = !arduinoEnLinea;
  });
  btnManual.disabled = !arduinoEnLinea;
  btnAuto.disabled = !arduinoEnLinea;
}
function actualizarPendiente(comando) {
  comandoPendiente = comando;
  estadoPendiente.textContent = comando ? `Orden pendiente: ${comando.toUpperCase()}` : 'Sin órdenes pendientes';
  aplicarModo(modo);
}
async function cambiarModo(nuevo) {
  if (!configurada() || !arduinoEnLinea) return;
  if (nuevo === modo && !comandoPendiente) return;
  try {
    const data = await enviarJSON(RUTA_MODO,{modo:nuevo});
    ultimoComando.textContent = (data.comando || nuevo).toUpperCase();
    actualizarPendiente(data.estado==='pendiente' ? data.comando : null);
    setEstado('aviso', data.estado==='pendiente' ? 'Cambio de modo enviado; esperando Arduino' : 'Modo confirmado');
  } catch (err) {
    setEstado('error',`No se pudo cambiar de modo: ${err.message}`);
  }
}
btnManual.addEventListener('click',()=>cambiarModo('manual'));
btnAuto.addEventListener('click',()=>cambiarModo('automatico'));

async function enviarComando(accion) {
  if (!configurada() || !arduinoEnLinea) return;
  if (modo === 'automatico' && accion !== 'detener') return;
  try {
    const data = await enviarJSON(RUTA_COMANDO,{accion});
    ultimoComando.textContent = accion.toUpperCase();
    actualizarPendiente(data.comando);
    setEstado('aviso', 'Orden enviada; esperando confirmación del Arduino');
  } catch(err) {
    setEstado('error',`No se pudo enviar: ${err.message}`);
  }
}
botonesComando.forEach(btn => btn.addEventListener('click',()=>enviarComando(btn.dataset.accion)));
document.addEventListener('keydown',e => {
  const el = document.activeElement;
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey ||
      (el && ['INPUT','TEXTAREA','SELECT','BUTTON'].includes(el.tagName))) return;
  if (e.key === 'ArrowLeft' && modo==='manual') {e.preventDefault();enviarComando('izquierda');}
  if (e.key === 'ArrowRight' && modo==='manual') {e.preventDefault();enviarComando('derecha');}
  if (e.key === ' ') {e.preventDefault();enviarComando('detener');}
});

function mostrarDistancia(cm) {
  relleno.className = 'relleno';
  proximidad.className = 'proximidad';
  const valido = typeof cm === 'number' && Number.isFinite(cm) && cm >= 0;
  if (!valido) {
    display.textContent = '---';
    display.classList.remove('alerta');
    relleno.style.width = '0%';
    proximidad.textContent = 'Sin lectura';
    return;
  }
  const valor = Math.round(cm);
  display.textContent = String(valor).padStart(3,'0');
  relleno.style.width = `${Math.max(0,Math.min(100,(1-valor/DISTANCIA_MAX)*100))}%`;
  if (valor <= DISTANCIA_PELIGRO) {
    display.classList.add('alerta');
    relleno.classList.add('peligro');
    proximidad.classList.add('peligro');
    proximidad.textContent = '¡OBSTÁCULO MUY CERCA!';
  } else if (valor <= DISTANCIA_PRECAUCION) {
    display.classList.remove('alerta');
    relleno.classList.add('precaucion');
    proximidad.classList.add('precaucion');
    proximidad.textContent = 'PRECAUCIÓN';
  } else {
    display.classList.remove('alerta');
    proximidad.classList.add('libre');
    proximidad.textContent = 'CAMINO LIBRE';
  }
}

async function actualizarDistancia() {
  if (!configurada()) {
    arduinoEnLinea = false;
    mostrarDistancia(null);
    actualizarPendiente(null);
    return;
  }
  try {
    const data = await peticion(RUTA_DISTANCIA);
    arduinoEnLinea = data.en_linea === true;
    mostrarDistancia(arduinoEnLinea ? data.distancia : null);
    if (data.modo === 'manual' || data.modo === 'automatico') aplicarModo(data.modo);
    estadoMotor.textContent = `Motor reportado: ${arduinoEnLinea ? (data.motor || 'desconocido') : 'sin conexión'}`;
    actualizarPendiente(data.comando_pendiente || null);
    setEstado(arduinoEnLinea ? 'ok':'aviso', arduinoEnLinea ? 'Arduino conectado':'API disponible, Arduino desconectado');
  } catch (err) {
    arduinoEnLinea = false;
    mostrarDistancia(null);
    actualizarPendiente(null);
    estadoMotor.textContent='Motor reportado: sin conexión';
    setEstado('error',err.status===401 ? 'Clave administrativa incorrecta' : 'Sin conexión con la API');
  }
}
function programarConsulta() {
  if (timerConsulta) clearTimeout(timerConsulta);
  timerConsulta = setTimeout(async()=> {
    if (!enConsulta) {
      enConsulta = true;
      try {await actualizarDistancia();} finally {enConsulta = false;}
    }
    programarConsulta();
  },INTERVALO_MS);
}
function leerFormulario() {
  const url = normalizarUrl(inputUrl.value);
  if (!urlValida(url)) {
    mensajeConfig('error','Escribe la URL completa de tu API y termina en /api (ej.: https://mi-api.onrender.com/api).');
    inputUrl.focus();return null;
  }
  const clave = inputClave.value.trim();
  if (!clave) {mensajeConfig('error','Ingresa la clave ADMIN_API_KEY definida en el servidor.');return null;}
  return {url,clave};
}
async function probarConexion(url, clave) {
  try {
    const data = await peticion(RUTA_DISTANCIA,{},url,clave);
    return {ok:true,data};
  } catch(error) {return {ok:false,error};}
}
btnProbar.addEventListener('click',async()=> {
  const cfg = leerFormulario();if (!cfg) return;
  if (bloqueoContenidoMixto(cfg.url)) {
    mensajeConfig('error','La web usa HTTPS y la API HTTP. Usa una API HTTPS.');return;
  }
  mensajeConfig('','Probando conexión...');
  const r=await probarConexion(cfg.url,cfg.clave);
  mensajeConfig(r.ok?'ok':'error',r.ok
    ? (r.data.en_linea ? 'API accesible y Arduino conectado.' : 'API accesible. Arduino todavía sin conexión.')
    : `Error de conexión: ${r.error.message}. Comprueba URL, clave y CORS.`);
});
formConfig.addEventListener('submit',async e => {
  e.preventDefault();
  const cfg=leerFormulario();if (!cfg) return;
  if (bloqueoContenidoMixto(cfg.url)) {
    mensajeConfig('error','No es posible usar HTTP desde una página HTTPS.');return;
  }
  apiBase=cfg.url;apiClave=cfg.clave;
  guardarLocal(CLAVE_URL,cfg.url);
  guardarSesion(CLAVE_ADMIN,cfg.clave); // no guardar contraseña en localStorage permanente
  mensajeConfig('ok','URL guardada y clave guardada solo durante la sesión de este navegador.');
  await actualizarDistancia();
});
btnBorrar.addEventListener('click',()=> {
  borrarLocal(CLAVE_URL);borrarSesion(CLAVE_ADMIN);
  apiBase=API_POR_DEFECTO;apiClave='';
  inputUrl.value=apiBase;inputClave.value='';
  mensajeConfig('ok','Configuración borrada.');
  actualizarDistancia();
});
btnVerClave.addEventListener('click',()=> {
  const oculta=inputClave.type==='password';
  inputClave.type=oculta?'text':'password';
  btnVerClave.textContent=oculta?'OCULTAR':'VER';
});

(function iniciar() {
  apiBase=normalizarUrl(leerLocal(CLAVE_URL)||API_POR_DEFECTO);
  apiClave=leerSesion(CLAVE_ADMIN);
  inputUrl.value=apiBase;
  inputClave.value=apiClave;
  actualizarPendiente(null);
  aplicarModo('manual');
  actualizarDistancia().finally(programarConsulta);
})();
