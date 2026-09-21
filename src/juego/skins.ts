/** Skins iniciales. Las de precio 0 se canjean gratis y son el look por defecto. */
export const SKINS: { tipo: 'ficha' | 'carta'; clave: string; nombre: string; descripcion: string; precio_puntos: number; rareza: 'comun' | 'rara' | 'epica' | 'legendaria' }[] = [
  { tipo: 'ficha', clave: 'frijol', nombre: 'Frijolito', descripcion: 'El clásico de toda la vida', precio_puntos: 0, rareza: 'comun' },
  { tipo: 'ficha', clave: 'maiz', nombre: 'Grano de maíz', descripcion: 'Amarillo y brillante', precio_puntos: 50, rareza: 'comun' },
  { tipo: 'ficha', clave: 'piedrita', nombre: 'Piedrita de río', descripcion: 'Lisa y gris', precio_puntos: 80, rareza: 'comun' },
  { tipo: 'ficha', clave: 'corcholata', nombre: 'Corcholata', descripcion: 'De refresco de vidrio', precio_puntos: 120, rareza: 'rara' },
  { tipo: 'ficha', clave: 'chile', nombre: 'Chilito', descripcion: 'Pica al marcar', precio_puntos: 200, rareza: 'rara' },
  { tipo: 'ficha', clave: 'calaverita', nombre: 'Calaverita de azúcar', descripcion: 'Con tu nombre en la frente', precio_puntos: 300, rareza: 'epica' },
  { tipo: 'ficha', clave: 'moneda_oro', nombre: 'Moneda de oro', descripcion: 'Brilla en cada casilla', precio_puntos: 500, rareza: 'legendaria' },
  { tipo: 'carta', clave: 'clasica', nombre: 'Clásica', descripcion: 'Ilustración tradicional', precio_puntos: 0, rareza: 'comun' },
  { tipo: 'carta', clave: 'papel_picado', nombre: 'Papel picado', descripcion: 'Bordes de fiesta', precio_puntos: 150, rareza: 'rara' },
  { tipo: 'carta', clave: 'dia_muertos', nombre: 'Día de Muertos', descripcion: 'Cempasúchil y catrinas', precio_puntos: 300, rareza: 'epica' },
  { tipo: 'carta', clave: 'lucha_libre', nombre: 'Lucha libre', descripcion: 'Cada carta con máscara', precio_puntos: 400, rareza: 'epica' },
  { tipo: 'carta', clave: 'neon', nombre: 'Neón', descripcion: 'Estilo cantina de noche', precio_puntos: 600, rareza: 'legendaria' },
];
