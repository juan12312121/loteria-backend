import { ZodTypeAny } from 'zod';

/**
 * Describe una tabla: qué columnas existen, cuáles nunca se devuelven,
 * cuáles se pueden filtrar/ordenar desde la URL y cómo se validan crear/actualizar.
 * El repositorio arma SQL SOLO con lo declarado aquí, así ningún filtro de la URL
 * puede meter nombres de columna arbitrarios.
 */
export abstract class BaseModel {
  abstract readonly tabla: string;
  readonly pk: string = 'id';
  abstract readonly columnas: readonly string[];
  readonly ocultas: readonly string[] = [];
  readonly filtrables: readonly string[] = [];
  readonly ordenables: readonly string[] = ['creado_en'];
  readonly ordenDefault: string = '-creado_en';
  abstract readonly crear: ZodTypeAny;
  abstract readonly actualizar: ZodTypeAny;

  get visibles(): string[] {
    return this.columnas.filter((c) => !this.ocultas.includes(c));
  }

  /** Lista de columnas visibles lista para un SELECT. */
  select(alias = ''): string {
    const p = alias ? `${alias}.` : '';
    return this.visibles.map((c) => `${p}"${c}"`).join(', ');
  }

  esColumna(c: string): boolean {
    return this.columnas.includes(c);
  }
}
