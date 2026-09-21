import { BaseRepository, OpcionesListar, Pagina } from '../repository/BaseRepository';
import { NotFound } from '../http/HttpError';

/** Quién hace la petición; lo pone el middleware auth. */
export interface Actor {
  id: string;
  rol: 'jugador' | 'admin' | 'bot';
}

/**
 * Lógica de negocio genérica. Los módulos sobreescriben los ganchos
 * (antesDeCrear, etc.) en vez de reescribir el CRUD.
 */
export class BaseService<T extends Record<string, any>> {
  constructor(protected readonly repo: BaseRepository<T>) {}

  protected async antesDeCrear(datos: Record<string, unknown>, _actor?: Actor) {
    return datos;
  }
  protected async despuesDeCrear(_fila: T, _actor?: Actor) {}
  protected async antesDeActualizar(_id: string, datos: Record<string, unknown>, _actor?: Actor) {
    return datos;
  }
  protected async antesDeBorrar(_fila: T, _actor?: Actor) {}

  listar(op: OpcionesListar, _actor?: Actor): Promise<Pagina<T>> {
    return this.repo.listar(op);
  }

  async obtener(id: string, _actor?: Actor): Promise<T> {
    const fila = await this.repo.obtener(id);
    if (!fila) throw new NotFound();
    return fila;
  }

  async crear(datos: Record<string, unknown>, actor?: Actor): Promise<T> {
    const fila = await this.repo.crear(await this.antesDeCrear(datos, actor));
    await this.despuesDeCrear(fila, actor);
    return fila;
  }

  async actualizar(id: string, datos: Record<string, unknown>, actor?: Actor): Promise<T> {
    await this.obtener(id, actor);
    const fila = await this.repo.actualizar(id, await this.antesDeActualizar(id, datos, actor));
    if (!fila) throw new NotFound();
    return fila;
  }

  async borrar(id: string, actor?: Actor): Promise<void> {
    const fila = await this.obtener(id, actor);
    await this.antesDeBorrar(fila, actor);
    await this.repo.borrar(id);
  }
}
