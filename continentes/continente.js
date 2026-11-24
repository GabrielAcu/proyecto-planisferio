const scriptsPorContinente = {
  'África': 'africa/africa.js',
  'América': 'america/america.js',
  'Antártida': 'antartida/antartida.js',
  'Asia': 'asia/asia.js',
  'Europa': 'europa/europa.js',
  'Oceanía': 'oceania/oceania.js'
};

const continente = document.body.dataset.continente;
const scriptLocal = scriptsPorContinente[continente];

if (!scriptLocal) {
  console.error(`No hay un script configurado para el continente: ${continente}`);
} else {
  const script = document.createElement('script');
  script.src = new URL(scriptLocal, document.currentScript.src).href;
  script.onerror = () => console.error(`No se pudo cargar el script del continente: ${scriptLocal}`);
  document.head.appendChild(script);
}
