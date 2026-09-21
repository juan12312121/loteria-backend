import { Actor, BaseService } from '../../core/service/BaseService';
import { OpcionesListar } from '../../core/repository/BaseRepository';
import { Conflict, Forbidden, NotFound, Unprocessable } from '../../core/http/HttpError';
import { Db, transaccion } from '../../db/pool';
import { diaLocal, enTemporada } from '../../juego/Progreso';
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

  /** Catálogo con "disponible": se puede comprar hoy (no es exclusiva y está en temporada). */
  async catalogo(usuarioId: string, tipo?: TipoSkin) {
    const hoy = diaLocal();
    const filas = await this.skins.catalogo(usuarioId, tipo);
    return filas.map((s) => ({ ...s, disponible: !s.exclusiva && enTemporada(s.temporada_inicio, s.temporada_fin, hoy) }));
  }

  coleccion(usuarioId: string) {
    return this.skins.coleccion(usuarioId);
  }

  mias(usuarioId: string) {
    return this.skins.deUsuario(usuarioId);
  }

  equipo(usuarioId: string) {
    return this.skins.equipoDe(usuarioId);
  }

  /** Regala una skin (misión o ranking) dentro de una transacción. */
  async regalar(db: Db, usuarioId: string, clave: string) {
    const skin = await this.skins.con(db).porClave(clave);
    if (!skin) return null;
    await this.skins.con(db).otorgar(usuarioId, skin.id);
    await this.usuarios.con(db).equiparSiVacio(usuarioId, skin.tipo, skin.id);
    return skin;
  }

  /** Compra con puntos. Si era su primera skin de ese tipo, se la pone. */
  canjear(skinId: string, actor: Actor) {
    return transaccion(async (db) => {
      const skins = this.skins.con(db);
      const skin = await skins.obtener(skinId);
      if (!skin || !skin.activa) throw new NotFound('Skin no disponible');
      if (skin.exclusiva) throw new Unprocessable('Esta skin no se vende: se gana con misiones o en el ranking');
      if (!enTemporada(skin.temporada_inicio, skin.temporada_fin, diaLocal()))
        throw new Unprocessable(`Esta skin solo se vende del ${skin.temporada_inicio} al ${skin.temporada_fin} (mes-día)`);
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
