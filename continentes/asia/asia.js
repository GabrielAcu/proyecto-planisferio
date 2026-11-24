const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const NS = 'http://www.w3.org/2000/svg';
const W = 1000, H = 500, PADDING = 30;
const ZOOM_MIN = 1, ZOOM_MAX = 8, ZOOM_FACTOR = 1.5;

const COLOR = '#2a9d8f';

function longitudCircular(lon) {
  return (lon + 360) % 360;
}

function crearProyeccion(paises) {
  const posiciones = paises.flatMap(pais => pais.poligonos.flat(2));
  const longitudes = [...new Set(posiciones.map(([lon]) => longitudCircular(lon)))].sort((a, b) => a - b);
  let inicio = longitudes[0];
  let mayorSalto = -1;

  for (let i = 0; i < longitudes.length; i++) {
    const siguiente = i === longitudes.length - 1 ? longitudes[0] + 360 : longitudes[i + 1];
    const salto = siguiente - longitudes[i];
    if (salto > mayorSalto) {
      mayorSalto = salto;
      inicio = siguiente % 360;
    }
  }

  const proyectarLongitud = lon => (longitudCircular(lon) - inicio + 360) % 360;
  const x = posiciones.map(([lon]) => proyectarLongitud(lon));
  const latitudes = posiciones.map(([, lat]) => lat);
  const minX = Math.min(...x), maxX = Math.max(...x);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const escala = Math.min(
    (W - PADDING * 2) / Math.max(maxX - minX, 1),
    (H - PADDING * 2) / Math.max(maxLat - minLat, 1)
  );
  const desplazamientoX = (W - (maxX - minX) * escala) / 2;
  const desplazamientoY = (H - (maxLat - minLat) * escala) / 2;

  return ([lon, lat]) => [
    desplazamientoX + (proyectarLongitud(lon) - minX) * escala,
    desplazamientoY + (maxLat - lat) * escala
  ];
}

function crearAnillo(coords, proyectar) {
  return 'M' + coords.map(p => proyectar(p).map(v => v.toFixed(1)).join(',')).join('L') + 'Z';
}

function mostrarEtiqueta(texto, x, y) {
  etiqueta.textContent = texto;
  etiqueta.style.display = 'block';
  if (x !== undefined && y !== undefined) {
    posicionarEtiqueta(x, y);
  }
}

function posicionarEtiqueta(x, y) {
  const margen = 8;
  const izquierda = Math.max(margen, Math.min(x + margen, innerWidth - etiqueta.offsetWidth - margen));
  const arriba = Math.max(margen, Math.min(y + margen, innerHeight - etiqueta.offsetHeight - margen));
  etiqueta.style.left = izquierda + 'px';
  etiqueta.style.top = arriba + 'px';
}

function ocultarEtiqueta() {
  etiqueta.style.display = 'none';
}

const continenteSeleccionado = 'Asia';
const svg = document.getElementById('mapa');
const etiqueta = document.getElementById('etiqueta');
const panelInfo = document.getElementById('info-pais');
const nombreInfo = document.getElementById('nombre-pais');
const banderaInfo = document.getElementById('bandera-pais');
const estadoBandera = document.getElementById('estado-bandera');
const continenteInfo = document.getElementById('info-continente');
const codigoInfo = document.getElementById('info-codigo');
const poblacionInfo = document.getElementById('info-poblacion');
const nivelZoom = document.getElementById('nivel-zoom');
const botonAcercar = document.getElementById('acercar');
const botonAlejar = document.getElementById('alejar');
const selectorPais = document.getElementById('selector-pais');
const elementosPorPais = new Map();
let nivelActual = ZOOM_MIN;
let centroX = W / 2, centroY = H / 2;
let paisSeleccionado = null;
let animacionZoom = 0;
let solicitudBandera = 0;

function actualizarZoom(animado = true) {
  const ancho = W / nivelActual;
  const alto = H / nivelActual;
  const izquierda = Math.max(0, Math.min(W - ancho, centroX - ancho / 2));
  const arriba = Math.max(0, Math.min(H - alto, centroY - alto / 2));
  const destino = { x: izquierda, y: arriba, ancho, alto };

  nivelZoom.textContent = `${Math.round(nivelActual * 100)}%`;
  botonAcercar.disabled = nivelActual === ZOOM_MAX;
  botonAlejar.disabled = nivelActual === ZOOM_MIN;

  if (animacionZoom) cancelAnimationFrame(animacionZoom);
  const actual = svg.viewBox.baseVal;
  const origen = { x: actual.x, y: actual.y, ancho: actual.width, alto: actual.height };
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!animado || reducirMovimiento) {
    svg.setAttribute('viewBox', `${destino.x} ${destino.y} ${destino.ancho} ${destino.alto}`);
    animacionZoom = 0;
    return;
  }

  const inicio = performance.now();
  const duracion = 220;
  function animar(ahora) {
    const progreso = Math.min((ahora - inicio) / duracion, 1);
    const facilidad = 1 - Math.pow(1 - progreso, 3);
    const x = origen.x + (destino.x - origen.x) * facilidad;
    const y = origen.y + (destino.y - origen.y) * facilidad;
    const w = origen.ancho + (destino.ancho - origen.ancho) * facilidad;
    const h = origen.alto + (destino.alto - origen.alto) * facilidad;
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);

    if (progreso < 1) {
      animacionZoom = requestAnimationFrame(animar);
    } else {
      animacionZoom = 0;
    }
  }
  animacionZoom = requestAnimationFrame(animar);
}

function ajustarZoom(factor) {
  nivelActual = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nivelActual * factor));
  if (paisSeleccionado && nivelActual > ZOOM_MIN) {
    centroX = paisSeleccionado.bounds.x + paisSeleccionado.bounds.width / 2;
    centroY = paisSeleccionado.bounds.y + paisSeleccionado.bounds.height / 2;
  } else if (nivelActual === ZOOM_MIN) {
    centroX = W / 2;
    centroY = H / 2;
  }
  actualizarZoom();
}

function restablecerZoom() {
  nivelActual = ZOOM_MIN;
  centroX = W / 2;
  centroY = H / 2;
  actualizarZoom();
}

function actualizarCentro(e) {
  const matriz = svg.getScreenCTM();
  if (!matriz) return;

  const punto = svg.createSVGPoint();
  punto.x = e.clientX;
  punto.y = e.clientY;
  const coordenadas = punto.matrixTransform(matriz.inverse());
  centroX = coordenadas.x;
  centroY = coordenadas.y;
}

function mostrarBandera(pais) {
  const solicitudActual = ++solicitudBandera;
  const codigo = [pais.codigoBandera, pais.codigoBanderaAlternativo]
    .find(valor => /^[a-z]{2}$/i.test(valor || ''));

  if (!codigo) {
    banderaInfo.hidden = true;
    banderaInfo.removeAttribute('src');
    banderaInfo.alt = '';
    estadoBandera.textContent = 'No hay una bandera disponible para este territorio.';
    estadoBandera.hidden = false;
    return;
  }

  estadoBandera.hidden = true;
  estadoBandera.textContent = '';
  banderaInfo.alt = `Bandera de ${pais.nombre}`;
  banderaInfo.onerror = () => {
    if (solicitudActual !== solicitudBandera) return;
    banderaInfo.hidden = true;
    banderaInfo.removeAttribute('src');
    estadoBandera.textContent = `No se pudo cargar la bandera de ${pais.nombre}.`;
    estadoBandera.hidden = false;
    console.error(`No se pudo cargar la bandera de ${pais.nombre}.`);
  };
  banderaInfo.src = `https://flagcdn.com/w160/${codigo.toLowerCase()}.png`;
  banderaInfo.hidden = false;
}

function seleccionarPais(pais, elemento) {
  if (paisSeleccionado) {
    paisSeleccionado.elemento.classList.remove('seleccionado');
    paisSeleccionado.elemento.setAttribute('aria-pressed', 'false');
  }

  paisSeleccionado = { elemento, bounds: elemento.getBBox() };
  elemento.classList.add('seleccionado');
  elemento.setAttribute('aria-pressed', 'true');
  nombreInfo.textContent = pais.nombre;
  mostrarBandera(pais);
  continenteInfo.textContent = continenteSeleccionado;
  codigoInfo.textContent = pais.codigo && pais.codigo !== '-99' ? pais.codigo : 'No disponible';
  selectorPais.value = pais.id;

  const poblacion = Number(pais.poblacion);
  poblacionInfo.textContent = pais.poblacion !== null && pais.poblacion !== '' && Number.isFinite(poblacion)
    ? new Intl.NumberFormat('es-ES').format(poblacion)
    : 'No disponible';
  panelInfo.hidden = false;
  ocultarEtiqueta();

  if (nivelActual > ZOOM_MIN) {
    centroX = paisSeleccionado.bounds.x + paisSeleccionado.bounds.width / 2;
    centroY = paisSeleccionado.bounds.y + paisSeleccionado.bounds.height / 2;
    actualizarZoom();
  }
}

function cerrarInformacion() {
  if (paisSeleccionado) {
    paisSeleccionado.elemento.classList.remove('seleccionado');
    paisSeleccionado.elemento.setAttribute('aria-pressed', 'false');
  }
  paisSeleccionado = null;
  panelInfo.hidden = true;
  solicitudBandera++;
  banderaInfo.hidden = true;
  banderaInfo.removeAttribute('src');
  banderaInfo.alt = '';
  estadoBandera.hidden = true;
  estadoBandera.textContent = '';
  selectorPais.value = '';
}

botonAcercar.addEventListener('click', () => ajustarZoom(ZOOM_FACTOR));
botonAlejar.addEventListener('click', () => ajustarZoom(1 / ZOOM_FACTOR));
document.getElementById('restablecer-zoom').addEventListener('click', restablecerZoom);
document.getElementById('cerrar-info').addEventListener('click', cerrarInformacion);
selectorPais.addEventListener('change', () => {
  if (!selectorPais.value) {
    cerrarInformacion();
    return;
  }
  const seleccion = elementosPorPais.get(selectorPais.value);
  if (seleccion) seleccionarPais(seleccion.pais, seleccion.elemento);
});
svg.addEventListener('pointermove', actualizarCentro);
svg.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
  const siguienteNivel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nivelActual * factor));
  if (siguienteNivel === nivelActual) return;

  actualizarCentro(e);
  ajustarZoom(factor);
}, { passive: false });

fetch(URL)
  .then(r => {
    if (!r.ok) throw new Error(`Error HTTP ${r.status}`);
    return r.json();
  })
  .then(datos => {
    const paises = datos.features.flatMap(f => {
      if (f.properties.CONTINENT !== 'Asia') return [];
      return [{
        nombre: f.properties.NAME_ES || f.properties.NAME,
        codigo: f.properties.ISO_A3,
        codigoBandera: f.properties.ISO_A2,
        codigoBanderaAlternativo: f.properties.ISO_A2_EH,
        poblacion: f.properties.POP_EST,
        poligonos: f.geometry.type === 'Polygon'
          ? [f.geometry.coordinates]
          : f.geometry.coordinates
      }];
    });

    const proyectar = crearProyeccion(paises);
    paises.forEach((pais, indice) => {
      pais.id = String(indice);
      const opcion = document.createElement('option');
      opcion.value = pais.id;
      opcion.textContent = pais.nombre;
      selectorPais.appendChild(opcion);

      const el = document.createElementNS(NS, 'path');
      el.classList.add('pais');
      el.setAttribute('d', pais.poligonos.map(poligono =>
        poligono.map(anillo => crearAnillo(anillo, proyectar)).join('')
      ).join(''));
      el.setAttribute('fill', COLOR);
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', pais.nombre);
      el.setAttribute('aria-pressed', 'false');

      el.addEventListener('pointerenter', e => {
        mostrarEtiqueta(pais.nombre, e.clientX, e.clientY);
      });
      el.addEventListener('pointermove', e => {
        posicionarEtiqueta(e.clientX, e.clientY);
      });
      el.addEventListener('pointerleave', () => {
        requestAnimationFrame(() => {
          if (!el.matches(':focus')) ocultarEtiqueta();
        });
      });
      el.addEventListener('focus', () => {
        const bounds = el.getBoundingClientRect();
        mostrarEtiqueta(pais.nombre, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      });
      el.addEventListener('blur', () => {
        if (!el.matches(':hover')) ocultarEtiqueta();
      });
      el.addEventListener('click', () => seleccionarPais(pais, el));
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          seleccionarPais(pais, el);
        }
      });

      svg.appendChild(el);
      elementosPorPais.set(pais.id, { pais, elemento: el });
    });
    actualizarZoom(false);
  })
  .catch(err => console.error('No se pudo cargar el mapa:', err));
