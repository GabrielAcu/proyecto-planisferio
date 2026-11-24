const URL = 'provincias.geojson';
const NS = 'http://www.w3.org/2000/svg';
const W = 640, H = 900, PADDING = 24;
const svg = document.getElementById('mapa');
const selectorProvincia = document.getElementById('selector-provincia');
const estadoMapa = document.getElementById('estado-mapa');
const panelInfo = document.getElementById('info-provincia');
const nombreInfo = document.getElementById('nombre-provincia');
const tipoInfo = document.getElementById('tipo-provincia');
const etiqueta = document.getElementById('etiqueta');
const elementosPorProvincia = new Map();
let provinciaSeleccionada = null;

function crearProyeccion(provincias) {
  const posiciones = provincias.flatMap(provincia => provincia.poligonos.flat(2));
  if (posiciones.length === 0) throw new Error('El GeoJSON no contiene coordenadas.');

  const longitudes = posiciones.map(([lon]) => lon);
  const latitudes = posiciones.map(([, lat]) => lat);
  const minLon = Math.min(...longitudes), maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const escala = Math.min(
    (W - PADDING * 2) / Math.max(maxLon - minLon, 1),
    (H - PADDING * 2) / Math.max(maxLat - minLat, 1)
  );
  const desplazamientoX = (W - (maxLon - minLon) * escala) / 2;
  const desplazamientoY = (H - (maxLat - minLat) * escala) / 2;

  return ([lon, lat]) => [
    desplazamientoX + (lon - minLon) * escala,
    desplazamientoY + (maxLat - lat) * escala
  ];
}

function crearAnillo(coordenadas, proyectar) {
  return 'M' + coordenadas.map(punto =>
    proyectar(punto).map(valor => valor.toFixed(1)).join(',')
  ).join('L') + 'Z';
}

function posicionarEtiqueta(x, y) {
  const margen = 8;
  etiqueta.style.left = Math.max(margen, Math.min(x + margen, innerWidth - etiqueta.offsetWidth - margen)) + 'px';
  etiqueta.style.top = Math.max(margen, Math.min(y + margen, innerHeight - etiqueta.offsetHeight - margen)) + 'px';
}

function mostrarEtiqueta(texto, x, y) {
  etiqueta.textContent = texto;
  etiqueta.style.display = 'block';
  posicionarEtiqueta(x, y);
}

function ocultarEtiqueta() {
  etiqueta.style.display = 'none';
}

function seleccionarProvincia(provincia, elemento) {
  if (provinciaSeleccionada) {
    provinciaSeleccionada.elemento.classList.remove('seleccionada');
    provinciaSeleccionada.elemento.setAttribute('aria-pressed', 'false');
  }

  provinciaSeleccionada = { provincia, elemento };
  elemento.classList.add('seleccionada');
  elemento.setAttribute('aria-pressed', 'true');
  selectorProvincia.value = provincia.id;
  nombreInfo.textContent = provincia.nombre;
  tipoInfo.textContent = provincia.tipo;
  panelInfo.hidden = false;
  ocultarEtiqueta();
}

fetch(URL)
  .then(respuesta => {
    if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
    return respuesta.json();
  })
  .then(datos => {
    if (!Array.isArray(datos.features) || datos.features.length === 0) {
      throw new Error('El GeoJSON no contiene divisiones administrativas.');
    }

    const provincias = datos.features.map((feature, indice) => ({
      id: String(indice),
      nombre: feature.properties.name,
      tipo: feature.properties.type,
      poligonos: feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates
    }));
    const proyectar = crearProyeccion(provincias);

    provincias.forEach(provincia => {
      const opcion = document.createElement('option');
      opcion.value = provincia.id;
      opcion.textContent = provincia.nombre;
      selectorProvincia.appendChild(opcion);

      const elemento = document.createElementNS(NS, 'path');
      elemento.classList.add('provincia');
      elemento.setAttribute('d', provincia.poligonos.map(poligono =>
        poligono.map(anillo => crearAnillo(anillo, proyectar)).join('')
      ).join(''));
      elemento.setAttribute('tabindex', '0');
      elemento.setAttribute('role', 'button');
      elemento.setAttribute('aria-label', provincia.nombre);
      elemento.setAttribute('aria-pressed', 'false');
      elemento.addEventListener('pointerenter', evento => {
        mostrarEtiqueta(provincia.nombre, evento.clientX, evento.clientY);
      });
      elemento.addEventListener('pointermove', evento => {
        posicionarEtiqueta(evento.clientX, evento.clientY);
      });
      elemento.addEventListener('pointerleave', () => {
        requestAnimationFrame(() => {
          if (!elemento.matches(':focus')) ocultarEtiqueta();
        });
      });
      elemento.addEventListener('focus', () => {
        const limites = elemento.getBoundingClientRect();
        mostrarEtiqueta(provincia.nombre, limites.left + limites.width / 2, limites.top + limites.height / 2);
      });
      elemento.addEventListener('blur', () => {
        if (!elemento.matches(':hover')) ocultarEtiqueta();
      });
      elemento.addEventListener('click', () => seleccionarProvincia(provincia, elemento));
      elemento.addEventListener('keydown', evento => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault();
          seleccionarProvincia(provincia, elemento);
        }
      });

      svg.appendChild(elemento);
      elementosPorProvincia.set(provincia.id, { provincia, elemento });
    });

    selectorProvincia.addEventListener('change', () => {
      const seleccion = elementosPorProvincia.get(selectorProvincia.value);
      if (seleccion) seleccionarProvincia(seleccion.provincia, seleccion.elemento);
    });

    const cantidadProvincias = provincias.filter(provincia => provincia.tipo === 'Provincia').length;
    const cantidadCiudades = provincias.length - cantidadProvincias;
    estadoMapa.textContent = `${cantidadProvincias} provincias y ${cantidadCiudades} división autónoma.`;
  })
  .catch(error => {
    estadoMapa.textContent = 'No se pudieron cargar las divisiones administrativas de Argentina.';
    console.error('No se pudo cargar el mapa de Argentina:', error);
  });
