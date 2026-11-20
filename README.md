# El Gabinete del Eclipse — Escape Room 3D

> **Observatorio de Valerio de Solís • 1894**  
> Un escape room 3D de estética victoriana-horológica en una sola habitación octogonal, jugable con ratón en PC o controles táctiles fluidos en móvil, instalable como **PWA** y **100 % offline**.

---

## Historia

El maestro relojero y astrónomo **Valerio de Solís** desapareció misteriosamente la noche del Gran Eclipse de 1894. Al cruzar el umbral de su gabinete secreto, la pesada **Puerta del Eclipse** se ha sellado a tus espaldas.

Para escapar deberás explorar cada rincón de la cámara, descifrar sus notas, manipular mecanismos de latón y óptica, y recuperar las **tres Reliquias Celestiales**:

- **☀ Engranaje Solar**
- **☽ Lente Lunar**
- **◈ Prisma Umbral**

---

## Cómo Jugar

El juego funciona en cualquier navegador moderno con WebGL (Chrome, Edge, Safari, Firefox) **sin conexión a internet**.

### Opción 1 — Lanzador rápido en Windows (Recomendado)
Haz doble clic en **`JUGAR.bat`**. Iniciará automáticamente un servidor local offline y abrirá el juego en tu navegador.

### Opción 2 — Desde consola con Python (PC y Móvil en la misma Wi-Fi)
```bash
python server.py
```
Escucha por defecto en `0.0.0.0:8000` (acepta `--host`, `--port` y `--no-browser`), abre `http://127.0.0.1:8000/index.html` en tu PC y muestra en consola la dirección **Wi-Fi LAN** (`http://<tu-ip-local>:8000/index.html`) para abrirlo directamente en tu móvil o tablet.

### Opción 3 — Apertura directa sin servidor
Haz doble clic directamente sobre **`index.html`**. Todo el motor 3D, las texturas procedurales y el audio están empaquetados localmente sin problemas de CORS.

---

## Instalar como App (PWA Offline)

El juego incluye `manifest.webmanifest`, iconos vectorizados y Service Worker offline (`sw.js`):

- **PC (Chrome / Edge):** abre el juego mediante `server.py` (o HTTPS) y pulsa **📲 Instalar App** en la pantalla de título o el icono de instalación en la barra de direcciones.
- **Android (Chrome):** abre la URL Wi-Fi o HTTPS y pulsa **📲 Instalar App** (o menú `⋮` → *Instalar aplicación* / *Añadir a pantalla de inicio*). Nota: la instalación completa en Android requiere HTTPS o `localhost`.
- **iPhone / iPad (Safari):** abre la URL en Safari, pulsa el botón **Compartir (`⬆`)** y elige **«Añadir a pantalla de inicio»** para jugar a pantalla completa.

---

## Controles

### Ratón (PC)
| Acción | Control |
| :--- | :--- |
| **Explorar la habitación 360°** | Arrastrar con el **botón izquierdo** o usar las flechas laterales `‹` / `›` |
| **Acercar zoom / Volver atrás** | **Rueda arriba** acerca la cámara; **rueda abajo** aleja y sale un nivel al llegar al encuadre base |
| **Acercarse / Interactuar / Recoger** | **Clic izquierdo** sobre estaciones, mecanismos y objetos |
| **Equipar objeto del inventario** | **Clic izquierdo** sobre el objeto en la barra inferior |
| **Inspeccionar objeto en 3D (360°)** | **Doble clic** o **clic derecho** sobre el objeto en el inventario (o botón *Inspeccionar 3D*) |
| **Alejar la cámara / Soltar objeto** | **Clic derecho** en cualquier punto de la escena o botón **← Volver** |

### Controles Táctiles (Móvil y Tablet)
| Acción | Gesto |
| :--- | :--- |
| **Mirar 360° con inercia fluida** | Arrastrar con **un dedo** en la habitación |
| **Interactuar / Examinar / Recoger** | **Toque rápido** con un dedo |
| **Hacer zoom en detalles** | **Pellizcar hacia fuera** (separar dos dedos) |
| **Alejar zoom / Salir un nivel** | **Pellizcar hacia dentro** (juntar dos dedos) o pulsar **← Volver** |
| **Inspector 3D** | Arrastrar con **un dedo** para rotar 360°, **dos dedos** para acercar/alejar y **toque** en mecanismos |

---

## Características

- **Habitación octogonal 3D artesanal** renderizada con Three.js (r170), iluminación PBR, reflejos metálicos realistas, resplandor cinematográfico (*UnrealBloom*) y texturas procedurales Canvas2D.
- **10 puzzles interconectados** de dificultad media-alta: estantería de grimorios planetarios, consola de válvulas de vapor, reloj astronómico de péndulo, catalejo desmontable en 3D, caja de resonancia musical, disco cifrador zodiacal y caja fuerte, linterna ultravioleta con tinta invisible, mesa de óptica con trazado de rayos en tiempo real, gran planetario mecánico y cerradura acoplada final.
- **Banda sonora atmosférica procedural** en Re menor / Dórico con reverberación estéreo y foley mecánico (Web Audio API), sin archivos de audio externos.
- **Inspector 3D interactivo** compatible con ratón y gestos táctiles.
- **Cuaderno de Valerio** con pistas y documentos ilustrados registrados automáticamente.
- **Brújula de Indicios** con sistema de pistas progresivas de 3 niveles adaptado a tu estado actual.
- **Guardado automático** en el navegador (*Continuar Partida*) y soporte **PWA offline**.

---

## Estructura del Proyecto

```text
SCAPE_ROOM/
├── index.html                  # Documento principal, meta PWA y scripts
├── styles.css                  # Interfaz victoriana responsive (PC y móvil)
├── manifest.webmanifest        # Manifiesto PWA instalable
├── sw.js                       # Service Worker cache-first offline
├── server.py                   # Servidor local y Wi-Fi LAN (Python 3)
├── JUGAR.bat                   # Lanzador directo para Windows
├── icons/                      # Iconos PWA (192, 512, maskable, Apple touch)
├── vendor/
│   └── three-bundle.js         # Three.js r170 + Postprocesado (offline)
└── src/
    ├── core/
    │   ├── state.js            # Estado global, inventario y persistencia
    │   ├── audio.js            # Banda sonora procedural y foley (Web Audio)
    │   ├── textures.js         # Generador de texturas PBR Canvas2D
    │   ├── materials.js        # Biblioteca de materiales PBR y registro UV
    │   └── camera.js           # Cámara 360° con inercia, zoom rueda y pellizco
    ├── room/
    │   ├── architecture.js     # Cámara octogonal, cúpula estelar y luces
    │   ├── props.js            # Vitral del Eclipse, chimenea y vitrina
    │   └── stations/           # 6 estaciones interactivas de puzzles
    ├── ui/                     # HUD móvil/PC, Inspector 3D, Diario, Pistas y Pantallas
    └── main.js                 # Bucle principal, entrada ratón/táctil y registro SW
```
