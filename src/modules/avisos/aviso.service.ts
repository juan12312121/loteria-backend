import { Actor } from '../../core/service/BaseService';
import { AvisoRepository } from './aviso.repository';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';
const POR_TANDA = 100;

interface Mensaje {
  titulo: string;
  cuerpo: string;
  datos?: Record<string, unknown>;
}

/**
 * Avisos al celular con el servicio de Expo. Si un token ya no sirve
 * (DeviceNotRegistered) se borra para no seguir intentando.
 */
export class AvisoService {
  constructor(private readonly avisos: AvisoRepository) {}

  registrar(token: string, actor: Actor) {
    return this.avisos.registrar(actor.id, token);
  }

  quitar(token: string) {
    return this.avisos.borrar(token);
  }

  /** La ronda arrancó: se avisa a los de la sala que no la están viendo. */
  async rondaIniciada(salaId: string, sala: string, anfitrionId: string) {
    const usuarios = await this.avisos.miembrosDeSala(salaId, anfitrionId);
    await this.enviar(usuarios, {
      titulo: '¡Ya va a empezar!',
      cuerpo: `La ronda de "${sala}" arrancó. Córrele a marcar tus tablas.`,
      datos: { tipo: 'ronda', salaId },
    });
  }

  /** Recordatorio de la tarde para quien no ha cobrado su recompensa. */
  async recordarDiario() {
    const usuarios = await this.avisos.pendientesDelDiario(await this.avisos.hoy());
    await this.enviar(usuarios, {
      titulo: 'Tu recompensa de hoy te espera',
      cuerpo: 'Entra a cobrarla y no pierdas tu racha de días seguidos.',
      datos: { tipo: 'diario' },
    });
    return usuarios.length;
  }

  private async enviar(usuarioIds: string[], mensaje: Mensaje) {
    const tokens = await this.avisos.deUsuarios(usuarioIds);
    for (let i = 0; i < tokens.length; i += POR_TANDA) {
      const tanda = tokens.slice(i, i + POR_TANDA);
      try {
        const r = await fetch(EXPO_PUSH, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(
            tanda.map((to) => ({ to, title: mensaje.titulo, body: mensaje.cuerpo, data: mensaje.datos, sound: 'default' })),
          ),
        });
        const json = (await r.json()) as { data?: { status: string; details?: { error?: string } }[] };
        await Promise.all(
          (json.data ?? []).map((t, j) =>
            t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? this.avisos.borrar(tanda[j]) : undefined,
          ),
        );
      } catch (e) {
        console.error('avisos', e);
      }
    }
  }
}
