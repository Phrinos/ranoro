import http from 'http';

const routes = [
  '/dashboard',
  '/agenda',
  '/servicios',
  '/caja',
  '/inventario/articulos',
  '/inventario/compras',
  '/inventario/proveedores',
  '/reportes',
  '/reporteflotilla',
  '/flotillav2',
  '/vehiculos',
  '/personal'
];

async function checkRoute(route) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${route}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ route, status: res.statusCode, ok: res.statusCode === 200 });
      });
    }).on('error', (err) => {
      resolve({ route, status: 0, ok: false, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing routes...');
  for (const route of routes) {
    const result = await checkRoute(route);
    console.log(`${result.route}: ${result.status} ${result.ok ? '✅' : '❌'}`);
  }
}

run();
