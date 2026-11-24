const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const NS = 'http://www.w3.org/2000/svg';

const COLORES = {
  'África': '#e9c46a',
  'América': '#e76f51',
  'Antártida': '#f1faee',
  'Asia': '#2a9d8f',
  'Europa': '#457b9d',
  'Oceanía': '#9b5de5'
};

const RESALTE = {
  'África': '#f4a300',
  'América': '#d62828',
  'Antártida': '#a8dadc',
  'Asia': '#06d6a0',
  'Europa': '#1d3557',
  'Oceanía': '#c77dff'
};

const RUTAS = {
  'África': 'continentes/africa/index.html',
  'América': 'continentes/america/index.html',
  'Antártida': 'continentes/antartida/index.html',
  'Asia': 'continentes/asia/index.html',
  'Europa': 'continentes/europa/index.html',
  'Oceanía': 'continentes/oceania/index.html'
};

function grupo(continente) {
  if (continente === 'North America' || continente === 'South America') return 'América';
  return {
    'Africa': 'África',
    'Asia': 'Asia',
    'Europe': 'Europa',
    'Oceania': 'Oceanía',
    'Antarctica': 'Antártida'
  }[continente];
}

function proyectar([lon, lat]) {
  return [(lon + 180) / 360 * 1000, (90 - lat) / 180 * 500];
}

function crearAnillo(coords) {
  return 'M' + coords.map(p => proyectar(p).map(v => v.toFixed(1)).join(',')).join('L') + 'Z';
}

const svg = document.getElementById('mapa');
const leyenda = document.getElementById('leyenda');
const etiqueta = document.getElementById('etiqueta');
const grupos = {};
const paisesPorContinente = {};

const OCEANOS = [
  { etiqueta: 'Pacífico', nombre: 'Océano Pacífico', longitud: -150, latitud: 0 },
  { etiqueta: 'Pacífico', nombre: 'Océano Pacífico', longitud: 150, latitud: 0 },
  { etiqueta: 'Atlántico', nombre: 'Océano Atlántico', longitud: -40, latitud: 35 },
  { etiqueta: 'Índico', nombre: 'Océano Índico', longitud: 80, latitud: -22 },
  { etiqueta: 'Ártico', nombre: 'Océano Ártico', longitud: 0, latitud: 75 },
  { etiqueta: 'Austral', nombre: 'Océano Austral', longitud: 0, latitud: -58 }
];

function dibujarOceanos() {
  const etiquetas = document.createElementNS(NS, 'g');
  etiquetas.classList.add('etiquetas-oceanos');

  OCEANOS.forEach(oceano => {
    const texto = document.createElementNS(NS, 'text');
    const [x, y] = proyectar([oceano.longitud, oceano.latitud]);
    texto.classList.add('oceano');
    texto.setAttribute('x', x);
    texto.setAttribute('y', y);
    texto.setAttribute('role', 'img');
    texto.setAttribute('aria-label', oceano.nombre);
    texto.textContent = oceano.etiqueta;
    etiquetas.appendChild(texto);
  });

  svg.appendChild(etiquetas);
  return etiquetas;
}

function dibujarGrilla() {
  const grilla = document.createElementNS(NS, 'g');
  grilla.classList.add('grilla-geografica');

  for (let longitud = -150; longitud <= 150; longitud += 30) {
    const linea = document.createElementNS(NS, 'line');
    const x = proyectar([longitud, 0])[0];
    linea.classList.add('meridiano');
    if (longitud === 0) {
      linea.classList.add('meridiano-greenwich');
      hacerInteractiva(
        linea,
        'Meridiano de Greenwich: línea de 0° de longitud, referencia para medir longitudes hacia el Este y el Oeste.'
      );
    } else {
      linea.setAttribute('aria-hidden', 'true');
    }
    linea.setAttribute('x1', x);
    linea.setAttribute('x2', x);
    linea.setAttribute('y1', 0);
    linea.setAttribute('y2', 500);
    grilla.appendChild(linea);
  }

  const y = proyectar([0, 0])[1];
  const bordeEcuador = document.createElementNS(NS, 'line');
  bordeEcuador.classList.add('ecuador-borde');
  bordeEcuador.setAttribute('x1', 0);
  bordeEcuador.setAttribute('x2', 1000);
  bordeEcuador.setAttribute('y1', y);
  bordeEcuador.setAttribute('y2', y);
  grilla.appendChild(bordeEcuador);

  const ecuador = document.createElementNS(NS, 'line');
  ecuador.classList.add('ecuador');
  hacerInteractiva(
    ecuador,
    'Ecuador terrestre: paralelo de 0° de latitud que divide la Tierra en los hemisferios Norte y Sur.'
  );
  ecuador.setAttribute('x1', 0);
  ecuador.setAttribute('x2', 1000);
  ecuador.setAttribute('y1', y);
  ecuador.setAttribute('y2', y);
  grilla.appendChild(ecuador);
  svg.appendChild(grilla);
}

function abrirContinente(continente) {
  window.location.href = RUTAS[continente];
}

function posicionarEtiqueta(x, y) {
  const margen = 8;
  const izquierda = Math.max(margen, Math.min(x + margen, innerWidth - etiqueta.offsetWidth - margen));
  const arriba = Math.max(margen, Math.min(y + margen, innerHeight - etiqueta.offsetHeight - margen));
  etiqueta.style.left = `${izquierda}px`;
  etiqueta.style.top = `${arriba}px`;
}

function mostrarEtiqueta(continente, x, y) {
  etiqueta.textContent = continente;
  etiqueta.style.display = 'block';
  posicionarEtiqueta(x, y);
}

function ocultarEtiqueta() {
  etiqueta.style.display = 'none';
}

function hacerInteractiva(linea, descripcion) {
  linea.setAttribute('tabindex', '0');
  linea.setAttribute('role', 'img');
  linea.setAttribute('aria-label', descripcion);
  linea.addEventListener('pointerenter', evento => {
    mostrarEtiqueta(descripcion, evento.clientX, evento.clientY);
  });
  linea.addEventListener('pointermove', evento => {
    posicionarEtiqueta(evento.clientX, evento.clientY);
  });
  linea.addEventListener('pointerleave', () => {
    if (!linea.matches(':focus')) ocultarEtiqueta();
  });
  linea.addEventListener('focus', () => {
    const limites = linea.getBoundingClientRect();
    mostrarEtiqueta(descripcion, limites.left + limites.width / 2, limites.top + limites.height / 2);
  });
  linea.addEventListener('blur', () => {
    if (!linea.matches(':hover')) ocultarEtiqueta();
  });
}

function resaltar(continente, resaltado) {
  (paisesPorContinente[continente] || []).forEach(pais => {
    pais.setAttribute('fill', resaltado ? RESALTE[continente] : COLORES[continente]);
  });
}

function crearGrupo(continente) {
  const el = document.createElementNS(NS, 'g');
  el.classList.add('continente');
  el.setAttribute('role', 'link');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `Abrir vista de ${continente}`);
  el.addEventListener('pointerenter', e => {
    resaltar(continente, true);
    mostrarEtiqueta(continente, e.clientX, e.clientY);
  });
  el.addEventListener('pointermove', e => posicionarEtiqueta(e.clientX, e.clientY));
  el.addEventListener('pointerleave', () => {
    resaltar(continente, false);
    if (!el.matches(':focus')) ocultarEtiqueta();
  });
  el.addEventListener('focus', () => {
    const bounds = el.getBoundingClientRect();
    mostrarEtiqueta(continente, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
  });
  el.addEventListener('blur', () => {
    if (!el.matches(':hover')) ocultarEtiqueta();
  });
  el.addEventListener('click', () => abrirContinente(continente));
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirContinente(continente);
    }
  });
  grupos[continente] = el;
  paisesPorContinente[continente] = [];
  svg.appendChild(el);
  return el;
}

const etiquetasOceanos = dibujarOceanos();

fetch(URL)
  .then(r => {
    if (!r.ok) throw new Error(`Error HTTP ${r.status}`);
    return r.json();
  })
  .then(datos => {
    datos.features.forEach(f => {
      const continente = grupo(f.properties.CONTINENT);
      if (!continente) return;

      const contenedor = grupos[continente] || crearGrupo(continente);
      const poligonos = f.geometry.type === 'Polygon'
        ? [f.geometry.coordinates]
        : f.geometry.coordinates;
      const pais = document.createElementNS(NS, 'path');

      pais.setAttribute('d', poligonos.map(poligono =>
        poligono.map(crearAnillo).join('')
      ).join(''));
      pais.setAttribute('fill', COLORES[continente]);
      contenedor.appendChild(pais);
      paisesPorContinente[continente].push(pais);
    });

    dibujarGrilla();
    svg.appendChild(etiquetasOceanos);

    Object.entries(COLORES).forEach(([nombre, color]) => {
      leyenda.insertAdjacentHTML('beforeend',
        `<span><i style="background:${color}"></i>${nombre}</span>`);
    });
  })
  .catch(err => console.error('No se pudo cargar el mapa:', err));
