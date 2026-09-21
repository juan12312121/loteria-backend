import { Actor, BaseService } from '../../core/service/BaseService';
import { OpcionesListar } from '../../core/repository/BaseRepository';
import { Conflict, Forbidden, NotFound, Unprocessable } from '../../core/http/HttpError';
import { codigoSala, REGLAS_SALA } from '../../juego/MotorLoteria';
import { bus } from '../../juego/bus';
import { FiguraRepository } from '../figuras/figura.repository';
import { FIGURA_POR_DEFECTO } from '../figuras/figura.model';
import { UsuarioRepository } from '../usuarios/usuario.repository';
import { SalaRepository } from './sala.repository';
import { Sala } from './sala.model';

export class SalaService extends BaseService<Sala> {
  constructor(
    private readonly salas: SalaRepository,
    private readonly figuras: FiguraRepository,
    private readonly usuarios: UsuarioRepository,
  ) {
    super(salas);
  }

  /** En el listado público solo salen las no privadas (admin ve todo). */
  listar(op: OpcionesListar, actor?: Actor) {
    if (actor?.rol === 'admin') return super.listar(op, actor);
    return super.listar({ ...op, filtros: { ...op.filtros, privada: false } }, actor);
  }

  protected async antesDeCrear(datos: Record<string, unknown>, actor?: Actor) {
    const figura_id = datos.figura_id ?? (await this.figuras.porClave(FIGURA_POR_DEFECTO))!.id;
    return { ...datos, figura_id, costo_tabla: REGLAS_SALA.costoTabla, anfitrion_id: actor!.id, codigo: codigoSala() };
  }

  protected async despuesDeCrear(sala: Sala, actor?: Actor) {
    await this.salas.agregarJugador(sala.id, actor!.id, 'anfitrion');
  }

  protected async antesDeActualizar(id: string, datos: Record<string, unknown>, actor?: Actor) {
    await this.exigirAnfitrion(id, actor!);
    return datos;
  }

  protected async antesDeBorrar(sala: Sala, actor?: Actor) {
    this.validarAnfitrion(sala, actor!);
  }

  async exigirAnfitrion(salaId: string, actor: Actor) {
    const sala = await this.obtener(salaId);
    this.validarAnfitrion(sala, actor);
    return sala;
  }

  async exigirMiembro(salaId: string, usuarioId: string) {
    if (!(await this.salas.esMiembro(salaId, usuarioId))) throw new Forbidden('No estás en esta sala');
  }

  /** Entrar con el código de invitación. Si ya estaba, no pasa nada. */
  async unirse(codigo: string, actor: Actor) {
    const sala = await this.salas.porCodigo(codigo);
    if (!sala) throw new NotFound('No existe una sala con ese código');
    if (sala.estado === 'cerrada') throw new Unprocessable('La sala ya cerró');
    if (await this.salas.esMiembro(sala.id, actor.id)) return sala;
    if ((await this.salas.contarJugadores(sala.id)) >= sala.max_jugadores) throw new Conflict('La sala está llena');
    await this.salas.agregarJugador(sala.id, actor.id);
    const usuario = await this.usuarios.obtener(actor.id);
    bus.emitir(sala.id, 'jugador:entro', { id: actor.id, nombre: usuario?.nombre });
    return sala;
  }

  async salir(salaId: string, actor: Actor) {
    const sala = await this.obtener(salaId);
    if (sala.anfitrion_id === actor.id) throw new Unprocessable('El anfitrión no puede salir; cierra la sala');
    await this.salas.quitarJugador(salaId, actor.id);
    bus.emitir(salaId, 'jugador:salio', { id: actor.id });
  }

  async jugadores(salaId: string, actor: Actor) {
    await this.exigirMiembro(salaId, actor.id);
    return this.salas.jugadores(salaId);
  }

  mias(usuarioId: string) {
    return this.salas.mias(usuarioId);
  }

  private validarAnfitrion(sala: Sala, actor: Actor) {
    if (actor.rol !== 'admin' && sala.anfitrion_id !== actor.id) throw new Forbidden('Solo el anfitrión de la sala');
  }
}
