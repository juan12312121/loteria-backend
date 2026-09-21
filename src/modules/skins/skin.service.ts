import { Actor, BaseService } from '../../core/service/BaseService';
import { OpcionesListar } from '../../core/repository/BaseRepository';
import { Conflict, Forbidden, NotFound, Unprocessable } from '../../core/http/HttpError';
import { transaccion } from '../../db/pool';
import { TipoSkin } from '../usuarios/usuario.model';
import { UsuarioRepository } from '../usuarios/usuario.repository';
import { PuntosService } from '../puntos/puntos.service';
import { SkinRepository } from './skin.repository';
import { Skin } from './skin.model';

export class SkinService extends BaseService<Skin> {
  constructor(
    private readonly skins: SkinRepository,
    private readonly usuarios: UsuarioRepository,
    private readonly puntos: PuntosService,
  ) {
    super(skins);
  }

  /** Los jugadores solo ven skins activas; admin ve todas. */
  listar(op: OpcionesListar, actor?: Actor) {
    if (actor?.rol === 'admin') return super.listar(op, actor);
    return super.listar({ ...op, filtros: { ...op.filtros, activa: true } }, actor);
  }

  catalogo(usuarioId: string, tipo?: TipoSkin) {
    return this.skins.catalogo(usuarioId, tipo);
  }

  mias(usuarioId: string) {
    return this.skins.deUsuario(usuarioId);
  }

  equipo(usuarioId: string) {
    return this.skins.equipoDe(usuarioId);
  }

  /** Compra con puntos. Si era su primera skin de ese tipo, se la pone. */
  canjear(skinId: string, actor: Actor) {
    return transaccion(async (db) => {
      const skins = this.skins.con(db);
      const skin = await skins.obtener(skinId);
      if (!skin || !skin.activa) throw new NotFound('Skin no disponible');
      if (await skins.laTiene(actor.id, skinId)) throw new Conflict('Ya tienes esa skin');
      if (skin.precio_puntos > 0) {
        const saldo = await this.puntos.cobrar(db, actor.id, skin.precio_puntos, `Skin ${skin.nombre}`);
        if (saldo === null) throw new Unprocessable(`Te faltan puntos: cuesta ${skin.precio_puntos}`);
      }
      await skins.otorgar(actor.id, skinId);
      await this.usuarios.con(db).equiparSiVacio(actor.id, skin.tipo, skinId);
      const usuario = await this.usuarios.con(db).obtener(actor.id);
      return { skin, puntos_restantes: usuario!.puntos };
    });
  }

  /** Aplica a TODAS las tablas del jugador. */
  async equipar(skinId: string, actor: Actor) {
    const skin = await this.obtener(skinId);
    if (!(await this.skins.laTiene(actor.id, skinId))) throw new Forbidden('No tienes esa skin; primero canjéala');
    await this.usuarios.equipar(actor.id, skin.tipo, skinId);
    return this.equipo(actor.id);
  }

  async quitar(tipo: TipoSkin, actor: Actor) {
    await this.usuarios.equipar(actor.id, tipo, null);
    return this.equipo(actor.id);
  }
}
