import { Actor, BaseService } from '../../core/service/BaseService';
import { Forbidden, Unprocessable } from '../../core/http/HttpError';
import { generarTabla, tablaValida } from '../../juego/MotorLoteria';
import { Tabla } from './tabla.model';

export class TablaService extends BaseService<Tabla> {
  protected async antesDeCrear(datos: Record<string, unknown>, actor?: Actor) {
    const cartas = (datos.cartas as number[] | undefined) ?? generarTabla();
    if (!tablaValida(cartas)) throw new Unprocessable('La tabla debe tener 16 cartas distintas del 1 al 54');
    if (datos.oficial && actor?.rol !== 'admin') throw new Forbidden('Solo admin crea tablas oficiales');
    return { ...datos, cartas, oficial: !!datos.oficial, creado_por: actor?.id ?? null };
  }

  protected async antesDeActualizar(id: string, datos: Record<string, unknown>, actor?: Actor) {
    this.exigirDueno(await this.obtener(id), actor);
    return datos;
  }

  protected async antesDeBorrar(tabla: Tabla, actor?: Actor) {
    if (tabla.oficial && actor?.rol !== 'admin') throw new Forbidden('Las tablas oficiales solo las borra admin');
    this.exigirDueno(tabla, actor);
  }

  private exigirDueno(tabla: Tabla, actor?: Actor) {
    if (actor?.rol !== 'admin' && tabla.creado_por !== actor?.id) throw new Forbidden('Esa tabla no es tuya');
  }
}
