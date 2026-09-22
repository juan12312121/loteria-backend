export type TipoSkinSemilla = 'ficha' | 'carta' | 'avatar' | 'fondo' | 'tema';

export interface SkinSemilla {
  tipo: TipoSkinSemilla;
  clave: string;
  nombre: string;
  descripcion: string;
  precio_puntos: number;
  rareza: 'comun' | 'rara' | 'epica' | 'legendaria';
  /** 'MM-DD': solo se vende en esas fechas */
  temporada?: [string, string];
  /** No se vende: se gana con una misión o en el ranking semanal */
  exclusiva?: boolean;
}

const SEPTIEMBRE: [string, string] = ['09-01', '09-30'];
const MUERTOS: [string, string] = ['10-15', '11-15'];
const POSADAS: [string, string] = ['12-01', '01-06'];

/** Skins del juego. Las de precio 0 se canjean gratis y son el look por defecto. */
export const SKINS: SkinSemilla[] = [
  // ---------- fichas ----------
  { tipo: 'ficha', clave: 'frijol', nombre: 'Frijolito', descripcion: 'El clásico de toda la vida', precio_puntos: 0, rareza: 'comun' },
  { tipo: 'ficha', clave: 'maiz', nombre: 'Grano de maíz', descripcion: 'Amarillo y brillante', precio_puntos: 50, rareza: 'comun' },
  { tipo: 'ficha', clave: 'piedrita', nombre: 'Piedrita de río', descripcion: 'Lisa y gris', precio_puntos: 80, rareza: 'comun' },
  { tipo: 'ficha', clave: 'corcholata', nombre: 'Corcholata', descripcion: 'De refresco de vidrio', precio_puntos: 120, rareza: 'rara' },
  { tipo: 'ficha', clave: 'chile', nombre: 'Chilito', descripcion: 'Pica al marcar', precio_puntos: 200, rareza: 'rara' },
  { tipo: 'ficha', clave: 'calaverita', nombre: 'Calaverita de azúcar', descripcion: 'Con tu nombre en la frente', precio_puntos: 300, rareza: 'epica' },
  { tipo: 'ficha', clave: 'moneda_oro', nombre: 'Moneda de oro', descripcion: 'Brilla en cada casilla', precio_puntos: 500, rareza: 'legendaria' },
  // Animales nacionales
  { tipo: 'ficha', clave: 'ajolote', nombre: 'Ajolote', descripcion: 'Sonriente, de los canales de Xochimilco', precio_puntos: 150, rareza: 'rara' },
  { tipo: 'ficha', clave: 'colibri', nombre: 'Colibrí', descripcion: 'Rápido como tus marcas', precio_puntos: 150, rareza: 'rara' },
  { tipo: 'ficha', clave: 'mariposa_monarca', nombre: 'Mariposa monarca', descripcion: 'Llega volando desde Michoacán', precio_puntos: 180, rareza: 'rara' },
  { tipo: 'ficha', clave: 'tortuga', nombre: 'Tortuga marina', descripcion: 'De las playas de Oaxaca', precio_puntos: 180, rareza: 'rara' },
  { tipo: 'ficha', clave: 'xolo', nombre: 'Xoloitzcuintle', descripcion: 'El perrito que guía a las almas', precio_puntos: 280, rareza: 'epica' },
  { tipo: 'ficha', clave: 'jaguar', nombre: 'Jaguar', descripcion: 'Señor de la selva maya', precio_puntos: 350, rareza: 'epica' },
  { tipo: 'ficha', clave: 'quetzal', nombre: 'Quetzal', descripcion: 'Plumas de jade', precio_puntos: 450, rareza: 'legendaria' },
  { tipo: 'ficha', clave: 'aguila', nombre: 'Águila real', descripcion: 'La del escudo nacional', precio_puntos: 600, rareza: 'legendaria' },
  // De temporada
  { tipo: 'ficha', clave: 'tricolor', nombre: 'Moño tricolor', descripcion: 'Solo en septiembre, mes patrio', precio_puntos: 120, rareza: 'rara', temporada: SEPTIEMBRE },
  { tipo: 'ficha', clave: 'cempasuchil', nombre: 'Flor de cempasúchil', descripcion: 'Solo en temporada de Día de Muertos', precio_puntos: 150, rareza: 'rara', temporada: MUERTOS },
  { tipo: 'ficha', clave: 'pinata', nombre: 'Piñata de picos', descripcion: 'Solo en posadas', precio_puntos: 150, rareza: 'rara', temporada: POSADAS },
  // Exclusivas
  { tipo: 'ficha', clave: 'sol_azteca', nombre: 'Sol azteca', descripcion: 'Misión: gana 10 partidas', precio_puntos: 0, rareza: 'legendaria', exclusiva: true },
  { tipo: 'ficha', clave: 'corona_oro', nombre: 'Corona de oro', descripcion: 'Para el 1.er lugar del ranking semanal', precio_puntos: 0, rareza: 'legendaria', exclusiva: true },

  // ---------- cartas ----------
  { tipo: 'carta', clave: 'clasica', nombre: 'Clásica', descripcion: 'Ilustración tradicional', precio_puntos: 0, rareza: 'comun' },
  { tipo: 'carta', clave: 'papel_picado', nombre: 'Papel picado', descripcion: 'Bordes de fiesta', precio_puntos: 150, rareza: 'rara' },
  { tipo: 'carta', clave: 'dia_muertos', nombre: 'Día de Muertos', descripcion: 'Cempasúchil y catrinas', precio_puntos: 300, rareza: 'epica' },
  { tipo: 'carta', clave: 'lucha_libre', nombre: 'Lucha libre', descripcion: 'Cada carta con máscara', precio_puntos: 400, rareza: 'epica' },
  { tipo: 'carta', clave: 'neon', nombre: 'Neón', descripcion: 'Estilo cantina de noche', precio_puntos: 600, rareza: 'legendaria' },
  { tipo: 'carta', clave: 'talavera', nombre: 'Talavera poblana', descripcion: 'Azulejo azul de Puebla', precio_puntos: 200, rareza: 'rara' },
  { tipo: 'carta', clave: 'caribe', nombre: 'Caribe mexicano', descripcion: 'Olas turquesa de Tulum', precio_puntos: 200, rareza: 'rara' },
  { tipo: 'carta', clave: 'ajolote_lago', nombre: 'Lago del ajolote', descripcion: 'Burbujas de Xochimilco', precio_puntos: 220, rareza: 'rara' },
  { tipo: 'carta', clave: 'xochimilco', nombre: 'Trajinera', descripcion: 'Franjas de colores sobre el canal', precio_puntos: 250, rareza: 'rara' },
  { tipo: 'carta', clave: 'monarca', nombre: 'Santuario monarca', descripcion: 'Alas naranjas de Michoacán', precio_puntos: 300, rareza: 'epica' },
  { tipo: 'carta', clave: 'chichen_itza', nombre: 'Chichén Itzá', descripcion: 'Escalones de la pirámide de Kukulkán', precio_puntos: 350, rareza: 'epica' },
  { tipo: 'carta', clave: 'alebrije', nombre: 'Alebrije', descripcion: 'Colores imposibles de Oaxaca', precio_puntos: 400, rareza: 'epica' },
  { tipo: 'carta', clave: 'selva_jaguar', nombre: 'Selva del jaguar', descripcion: 'Manchas de la selva lacandona', precio_puntos: 450, rareza: 'epica' },
  { tipo: 'carta', clave: 'bellas_artes', nombre: 'Bellas Artes', descripcion: 'Art déco negro y oro', precio_puntos: 700, rareza: 'legendaria' },
  { tipo: 'carta', clave: 'patria', nombre: 'Viva México', descripcion: 'Verde, blanco y rojo: solo en septiembre', precio_puntos: 250, rareza: 'epica', temporada: SEPTIEMBRE },
  { tipo: 'carta', clave: 'posada', nombre: 'Posada', descripcion: 'Piñatas y luces: solo en diciembre', precio_puntos: 250, rareza: 'epica', temporada: POSADAS },

  // ---------- avatares ----------
  { tipo: 'avatar', clave: 'av_gallo', nombre: 'El Gallo', descripcion: 'El primero en cantar', precio_puntos: 0, rareza: 'comun' },
  { tipo: 'avatar', clave: 'av_ajolote', nombre: 'Ajolote', descripcion: 'Siempre sonriendo', precio_puntos: 100, rareza: 'comun' },
  { tipo: 'avatar', clave: 'av_xolo', nombre: 'Xolo', descripcion: 'Fiel compañero', precio_puntos: 120, rareza: 'comun' },
  { tipo: 'avatar', clave: 'av_monarca', nombre: 'Monarca', descripcion: 'Viajera incansable', precio_puntos: 120, rareza: 'comun' },
  { tipo: 'avatar', clave: 'av_jaguar', nombre: 'Jaguar', descripcion: 'Mirada de cazador', precio_puntos: 200, rareza: 'rara' },
  { tipo: 'avatar', clave: 'av_charro', nombre: 'Charro', descripcion: 'Con todo y sombrero', precio_puntos: 250, rareza: 'rara' },
  { tipo: 'avatar', clave: 'av_luchador', nombre: 'Luchador', descripcion: 'Máscara de campeón', precio_puntos: 250, rareza: 'rara' },
  { tipo: 'avatar', clave: 'av_catrina', nombre: 'Catrina', descripcion: 'Elegante hasta el final', precio_puntos: 350, rareza: 'epica' },
  { tipo: 'avatar', clave: 'av_cantor', nombre: 'El Cantor', descripcion: 'Misión: logra 25 figuras', precio_puntos: 0, rareza: 'legendaria', exclusiva: true },

  // ---------- fondos de sala ----------
  { tipo: 'fondo', clave: 'feria', nombre: 'Feria', descripcion: 'Papel picado sobre crema', precio_puntos: 0, rareza: 'comun' },
  { tipo: 'fondo', clave: 'kermes', nombre: 'Kermés', descripcion: 'Foquitos de colores', precio_puntos: 150, rareza: 'comun' },
  { tipo: 'fondo', clave: 'playa', nombre: 'Playa', descripcion: 'Arena y olas', precio_puntos: 200, rareza: 'rara' },
  { tipo: 'fondo', clave: 'cantina', nombre: 'Cantina', descripcion: 'Madera y azulejo', precio_puntos: 250, rareza: 'rara' },
  { tipo: 'fondo', clave: 'panteon', nombre: 'Panteón', descripcion: 'Velas y noche morada', precio_puntos: 300, rareza: 'epica' },
  { tipo: 'fondo', clave: 'noche_feria', nombre: 'Noche de feria', descripcion: 'Estrellas y rueda de la fortuna', precio_puntos: 400, rareza: 'epica' },
  // ---------- temas de color de la app ----------
  { tipo: 'tema', clave: 'tema_clasico', nombre: 'Clásico', descripcion: 'Crema y rosa mexicano de la baraja', precio_puntos: 0, rareza: 'comun' },
  { tipo: 'tema', clave: 'tema_noche', nombre: 'Noche de feria', descripcion: 'Morado de noche con luces de colores', precio_puntos: 0, rareza: 'comun' },
  { tipo: 'tema', clave: 'tema_talavera', nombre: 'Talavera', descripcion: 'Blanco y azul de Puebla', precio_puntos: 200, rareza: 'rara' },
  { tipo: 'tema', clave: 'tema_barro', nombre: 'Barro', descripcion: 'Terracota y turquesa de Oaxaca', precio_puntos: 200, rareza: 'rara' },
  { tipo: 'tema', clave: 'tema_mercado', nombre: 'Mercado', descripcion: 'Rosa mexicano y verde de puesto de fruta', precio_puntos: 250, rareza: 'rara' },
  { tipo: 'tema', clave: 'tema_jade', nombre: 'Jade maya', descripcion: 'Verde jade, piedra y oro', precio_puntos: 300, rareza: 'epica' },
  { tipo: 'tema', clave: 'tema_lucha', nombre: 'Lucha libre', descripcion: 'Arena oscura con rojo y azul eléctrico', precio_puntos: 400, rareza: 'epica' },
  { tipo: 'tema', clave: 'tema_cempasuchil', nombre: 'Cempasúchil', descripcion: 'Naranja de altar: solo en Día de Muertos', precio_puntos: 250, rareza: 'epica', temporada: MUERTOS },
  { tipo: 'fondo', clave: 'altar', nombre: 'Altar de muertos', descripcion: 'Solo en temporada de Día de Muertos', precio_puntos: 250, rareza: 'epica', temporada: MUERTOS },
];
