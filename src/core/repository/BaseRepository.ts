import { pool, Db } from '../../db/pool';
import { BaseModel } from '../model/BaseModel';
import { BadRequest } from '../http/HttpError';

export interface OpcionesListar {
  pagina?: number;
  porPagina?: number;
  /** "campo" ascendente, "-campo" descendente */
  orden?: string;
  filtros?: Record<string, unknown>;
}

export interface Pagina<T> {
  filas: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * CRUD genérico sobre una tabla. Todo el SQL es parametrizado y las columnas
 * vienen del modelo, nunca del cliente.
 */
export class BaseRepository<T extends Record<string, any>> {
  constructor(
    protected readonly model: BaseModel,
    protected readonly db: Db = pool,
  ) {}

  /** Mismo repositorio pero usando un cliente de transacción. */
  con(db: Db): this {
    return new (this.constructor as any)(this.model, db);
  }

  /** Atajos para las consultas propias de cada repositorio. */
  protected async filas<R = any>(sql: string, params: unknown[] = []): Promise<R[]> {
    const { rows } = await this.db.query(sql, params);
    return rows as R[];
  }

  protected async fila<R = any>(sql: string, params: unknown[] = []): Promise<R | null> {
    const { rows } = await this.db.query(sql, params);
    return (rows[0] as R) ?? null;
  }

  protected async ejecutar(sql: string, params: unknown[] = []): Promise<number> {
    const r = await this.db.query(sql, params);
    return r.rowCount ?? 0;
  }

  protected where(filtros: Record<string, unknown> = {}, desde = 1) {
    const partes: string[] = [];
    const valores: unknown[] = [];
    for (const [k, v] of Object.entries(filtros)) {
      if (v === undefined || v === '') continue;
      if (!this.model.filtrables.includes(k)) throw new BadRequest(`No se puede filtrar por "${k}"`);
      valores.push(v);
      partes.push(`"${k}" = $${desde + valores.length - 1}`);
    }
    return { sql: partes.length ? ` WHERE ${partes.join(' AND ')}` : '', valores };
  }

  protected orderBy(orden?: string): string {
    const o = orden || this.model.ordenDefault;
    const desc = o.startsWith('-');
    const col = desc ? o.slice(1) : o;
    if (!this.model.ordenables.includes(col)) throw new BadRequest(`No se puede ordenar por "${col}"`);
    return ` ORDER BY "${col}" ${desc ? 'DESC' : 'ASC'}`;
  }

  async listar(op: OpcionesListar = {}): Promise<Pagina<T>> {
    const pagina = Math.max(1, op.pagina ?? 1);
    const porPagina = Math.min(100, Math.max(1, op.porPagina ?? 20));
    const w = this.where(op.filtros);
    const total = await this.contar(op.filtros);
    const { rows } = await this.db.query(
      `SELECT ${this.model.select()} FROM "${this.model.tabla}"${w.sql}${this.orderBy(op.orden)}
       LIMIT $${w.valores.length + 1} OFFSET $${w.valores.length + 2}`,
      [...w.valores, porPagina, (pagina - 1) * porPagina],
    );
    return { filas: rows as T[], total, pagina, porPagina };
  }

  async contar(filtros?: Record<string, unknown>): Promise<number> {
    const w = this.where(filtros);
    const { rows } = await this.db.query(`SELECT count(*)::int AS n FROM "${this.model.tabla}"${w.sql}`, w.valores);
    return rows[0].n;
  }

  async obtener(id: unknown): Promise<T | null> {
    const { rows } = await this.db.query(
      `SELECT ${this.model.select()} FROM "${this.model.tabla}" WHERE "${this.model.pk}" = $1`,
      [id],
    );
    return (rows[0] as T) ?? null;
  }

  async buscarUno(filtros: Record<string, unknown>): Promise<T | null> {
    const w = this.where(filtros);
    const { rows } = await this.db.query(
      `SELECT ${this.model.select()} FROM "${this.model.tabla}"${w.sql} LIMIT 1`,
      w.valores,
    );
    return (rows[0] as T) ?? null;
  }

  async crear(datos: Record<string, unknown>): Promise<T> {
    const cols = Object.keys(datos).filter((c) => this.model.esColumna(c));
    if (!cols.length) throw new BadRequest('Nada que guardar');
    const { rows } = await this.db.query(
      `INSERT INTO "${this.model.tabla}" (${cols.map((c) => `"${c}"`).join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING ${this.model.select()}`,
      cols.map((c) => datos[c]),
    );
    return rows[0] as T;
  }

  async actualizar(id: unknown, datos: Record<string, unknown>): Promise<T | null> {
    const cols = Object.keys(datos).filter((c) => this.model.esColumna(c) && c !== this.model.pk);
    if (!cols.length) return this.obtener(id);
    const set = cols.map((c, i) => `"${c}" = $${i + 2}`);
    if (this.model.esColumna('actualizado_en')) set.push('"actualizado_en" = now()');
    const { rows } = await this.db.query(
      `UPDATE "${this.model.tabla}" SET ${set.join(', ')} WHERE "${this.model.pk}" = $1
       RETURNING ${this.model.select()}`,
      [id, ...cols.map((c) => datos[c])],
    );
    return (rows[0] as T) ?? null;
  }

  async borrar(id: unknown): Promise<boolean> {
    const r = await this.db.query(`DELETE FROM "${this.model.tabla}" WHERE "${this.model.pk}" = $1`, [id]);
    return (r.rowCount ?? 0) > 0;
  }
}
