import bcrypt from 'bcryptjs';
import { Conflict, Unauthorized } from '../../core/http/HttpError';
import { firmarToken } from '../../core/middleware/auth';
import { UsuarioRepository } from '../usuarios/usuario.repository';
import { SkinService } from '../skins/skin.service';

const RONDAS_BCRYPT = 10;

export interface DatosRegistro {
  nombre: string;
  correo: string;
  password: string;
}

export class AuthService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly skins: SkinService,
  ) {}

  async registrar({ nombre, correo, password }: DatosRegistro) {
    if (await this.usuarios.porCorreoConHash(correo)) throw new Conflict('Ese correo ya está registrado');
    const usuario = await this.usuarios.crear({
      nombre,
      correo: correo.toLowerCase(),
      password_hash: await bcrypt.hash(password, RONDAS_BCRYPT),
      rol: 'jugador',
    });
    return { usuario, token: firmarToken({ id: usuario.id, rol: usuario.rol }) };
  }

  async login(correo: string, password: string) {
    const encontrado = await this.usuarios.porCorreoConHash(correo);
    if (!encontrado || encontrado.rol === 'bot' || !(await bcrypt.compare(password, encontrado.password_hash)))
      throw new Unauthorized('Correo o contraseña incorrectos');
    const { password_hash: _hash, ...usuario } = encontrado;
    return { usuario, token: firmarToken({ id: usuario.id, rol: usuario.rol }) };
  }

  /** Perfil con lo que trae puesto (skin de ficha y de carta). */
  async perfil(usuarioId: string) {
    const [usuario, equipo] = await Promise.all([this.usuarios.obtener(usuarioId), this.skins.equipo(usuarioId)]);
    if (!usuario) throw new Unauthorized('La cuenta ya no existe');
    return { ...usuario, equipo };
  }
}
