export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles: unknown[] = [],
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

export class BadRequest extends HttpError {
  constructor(mensaje = 'Petición inválida', detalles: unknown[] = []) {
    super(400, 'PETICION_INVALIDA', mensaje, detalles);
  }
}
export class Unauthorized extends HttpError {
  constructor(mensaje = 'No autenticado') {
    super(401, 'NO_AUTENTICADO', mensaje);
  }
}
export class Forbidden extends HttpError {
  constructor(mensaje = 'No tienes permiso') {
    super(403, 'PROHIBIDO', mensaje);
  }
}
export class NotFound extends HttpError {
  constructor(mensaje = 'No encontrado') {
    super(404, 'NO_ENCONTRADO', mensaje);
  }
}
export class Conflict extends HttpError {
  constructor(mensaje = 'Conflicto') {
    super(409, 'CONFLICTO', mensaje);
  }
}
export class Unprocessable extends HttpError {
  constructor(mensaje = 'No se puede procesar', detalles: unknown[] = []) {
    super(422, 'NO_PROCESABLE', mensaje, detalles);
  }
}
export class Internal extends HttpError {
  constructor(mensaje = 'Error interno') {
    super(500, 'ERROR_INTERNO', mensaje);
  }
}
