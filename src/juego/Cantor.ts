/**
 * Un temporizador por partida en modo automático. Cada tick llama a `cantar`;
 * si cantar avisa que ya no hay partida activa, el temporizador se apaga solo.
 */
class CantorAutomatico {
  private timers = new Map<string, NodeJS.Timeout>();

  iniciar(partidaId: string, cadaMs: number, cantar: () => Promise<boolean>) {
    this.detener(partidaId);
    const t = setInterval(async () => {
      try {
        const sigue = await cantar();
        if (!sigue) this.detener(partidaId);
      } catch (e) {
        console.error('cantor', partidaId, e);
        this.detener(partidaId);
      }
    }, cadaMs);
    this.timers.set(partidaId, t);
  }

  detener(partidaId: string) {
    const t = this.timers.get(partidaId);
    if (t) clearInterval(t);
    this.timers.delete(partidaId);
  }

  activo(partidaId: string) {
    return this.timers.has(partidaId);
  }
}

export const cantor = new CantorAutomatico();
