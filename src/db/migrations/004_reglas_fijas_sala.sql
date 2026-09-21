-- El anfitrión ya no configura cuántas tablas juega cada quien ni cuánto cuesta la tabla:
-- el costo es fijo (por defecto) y cada jugador escoge sus tablas hasta el tope general del juego.
ALTER TABLE salas ALTER COLUMN costo_tabla SET DEFAULT 10;
ALTER TABLE salas DROP COLUMN IF EXISTS max_tablas;
