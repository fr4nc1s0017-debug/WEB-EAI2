# WebEAI | WEB (sitio estático independiente)

Esta carpeta contiene **solo el panel web** (`index.html`, `style.css`, `script.js` e imágenes). No incluye servidores ni claves privadas. El diseño original se conserva.

## Publicar la WEB en Render

1. Extrae este ZIP y sube **su contenido** a la raíz de un repositorio GitHub propio, separado del repositorio de la API.
2. En Render: **New > Static Site** y selecciona el repositorio WEB.
3. Build Command: `echo "WebEAI estatico sin compilacion"`.
4. Publish Directory: `.` (raíz del repositorio).
5. Publica y copia la URL, por ejemplo `https://webeai-web.onrender.com`.

También puedes utilizar el `render.yaml` de este paquete como Blueprint (en ese caso no crees otra vez el mismo servicio desde el panel).

## Conectar la WEB con la API

1. La API debe publicarse por separado como **Web Service de Node.js**.
2. En Render, dentro de la API, agrega `CORS_ORIGINS` con **la URL exacta del sitio web**, por ejemplo: `https://webeai-web.onrender.com` (sin `/` final). Reinicia/despliega la API con esa variable.
3. Abre la web y baja a **CONFIGURACIÓN DE LA API**.
4. En URL escribe la URL pública de la API **terminada en `/api`**, por ejemplo: `https://api-eai.onrender.com/api`.
5. Introduce **ADMIN_API_KEY**, configurada solo en el servicio de la API. No es la clave del Arduino.
6. Pulsa **PROBAR CONEXIÓN** y luego **GUARDAR Y CONECTAR**.

La URL se guarda en `localStorage`, y la clave administrativa solo en `sessionStorage`. Ni una ni otra se incluyen en el código distribuido. Usa HTTPS en ambos sitios. Evita acceder al panel desde computadoras compartidas.

## Probar localmente

Sirve esta carpeta en un servidor HTTP local, por ejemplo con Python instalado:

```bash
python -m http.server 8080
```

Abre `http://localhost:8080`, introduce `http://localhost:3000/api` como URL de API y agrega `http://localhost:8080` a `CORS_ORIGINS` de la API si haces pruebas entre ambos servidores.

**Nota:** Render Static Site no necesita Node.js ni un servidor de backend para esta carpeta.
