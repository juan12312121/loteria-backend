import { Actor } from '../../core/service/BaseService';
import { Conflict, NotFound, Unprocessable } from '../../core/http/HttpError';
import { UsuarioRepository } from '../usuarios/usuario.repository';
import { AmigoRepository } from './amigo.repository';

/**
 * Amigos: se agregan con un código de 6 letras, se ve quién está en línea
 * y en qué sala anda, y se lleva la cuenta de las revanchas entre los dos.
 */
export class AmigoService {
  constructor(
    private readonly amigos: AmigoRepository,
    private readonly usuarios: UsuarioRepository,
  ) {}

  async resumen(usuarioId: string) {
    const [usuario, lista, pendientes, enviadas] = await Promise.all([
      this.usuarios.obtener(usuarioId),
      this.amigos.lista(usuarioId),
      this.amigos.pendientes(usuarioId),
      this.amigos.enviadas(usuarioId),
    ]);
    return { mi_codigo: usuario?.codigo_amigo ?? '', amigos: lista, pendientes, enviadas };
  }

  /** Manda solicitud con el código del otro. Si él ya me había mandado una, quedamos amigos. */
  async solicitar(codigo: string, actor: Actor) {
    const otro = await this.amigos.porCodigo(codigo);
    if (!otro) throw new NotFound('No hay nadie con ese código');
    if (otro.id === actor.id) throw new Unprocessable('Ese es tu propio código');
    const relacion = await this.amigos.relacion(actor.id, otro.id);
    if (relacion?.estado === 'aceptada') throw new Conflict(`${otro.nombre} ya es tu amigo`);
    if (relacion?.solicitante_id === actor.id) throw new Conflict('Ya le mandaste solicitud; falta que la acepte');
    if (relacion) {
      await this.amigos.aceptar(otro.id, actor.id);
      return { estado: 'aceptada' as const, amigo: otro };
    }
    await this.amigos.solicitar(actor.id, otro.id);
    return { estado: 'pendiente' as const, amigo: otro };
  }

  async aceptar(solicitanteId: string, actor: Actor) {
    if (!(await this.amigos.aceptar(solicitanteId, actor.id))) throw new NotFound('Esa solicitud ya no está');
    return this.resumen(actor.id);
  }

  /** Sirve para rechazar una solicitud y para dejar de ser amigos. */
  async quitar(otroId: string, actor: Actor) {
    if (!(await this.amigos.quitar(actor.id, otroId))) throw new NotFound('No estaban conectados');
  }

  async historial(otroId: string, actor: Actor) {
    const relacion = await this.amigos.relacion(actor.id, otroId);
    if (relacion?.estado !== 'aceptada') throw new NotFound('Ese jugador no es tu amigo');
    const otro = await this.usuarios.obtener(otroId);
    const cuenta = await this.amigos.historial(actor.id, otroId);
    return { amigo: { id: otroId, nombre: otro?.nombre ?? '' }, ...cuenta };
  }

  /** Ids de mis amigos (para avisarles cuando entro a una sala, por ejemplo). */
  async ids(usuarioId: string) {
    return (await this.amigos.lista(usuarioId)).map((a) => a.id);
  }
}
