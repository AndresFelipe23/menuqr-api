import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { LogCategory } from '../utils/logger';
import { CrearRestauranteDto, ActualizarRestauranteDto, QueryRestauranteDto } from '../dto';
import { getMonteriaLocalDate } from '../utils/date.utils';

export interface Restaurante {
  id: string;
  nombre: string;
  slug: string;
  correo: string;
  telefono: string | null;
  biografia: string | null;
  imagenPerfilUrl: string | null;
  imagenPortadaUrl: string | null;
  colorTema: string;
  colorTexto: string;
  colorFondo: string;
  familiaFuente: string;
  mostrarMenu: boolean;
  mostrarEnlaces: boolean;
  mostrarContacto: boolean;
  habilitarPedidos: boolean;
  direccion: string | null;
  ciudad: string | null;
  estadoProvincia: string | null;
  pais: string | null;
  codigoPostal: string | null;
  latitud: number | null;
  longitud: number | null;
  zonaHoraria: string;
  moneda: string;
  idioma: string;
  activo: boolean;
  estadoSuscripcion: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaEliminacion: Date | null;
}

export interface PaginatedRestaurantes {
  items: Restaurante[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class RestaurantsService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Convierte un resultado de base de datos a la interfaz Restaurante
   */
  private mapToRestaurante(row: any): Restaurante {
    return {
      id: row.id,
      nombre: row.nombre,
      slug: row.slug,
      correo: row.correo,
      telefono: row.telefono,
      biografia: row.biografia,
      imagenPerfilUrl: row.imagen_perfil_url,
      imagenPortadaUrl: row.imagen_portada_url,
      colorTema: row.color_tema,
      colorTexto: row.color_texto,
      colorFondo: row.color_fondo,
      familiaFuente: row.familia_fuente,
      mostrarMenu: row.mostrar_menu === 1 || row.mostrar_menu === true,
      mostrarEnlaces: row.mostrar_enlaces === 1 || row.mostrar_enlaces === true,
      mostrarContacto: row.mostrar_contacto === 1 || row.mostrar_contacto === true,
      habilitarPedidos: row.habilitar_pedidos === 1 || row.habilitar_pedidos === true,
      direccion: row.direccion,
      ciudad: row.ciudad,
      estadoProvincia: row.estado_provincia,
      pais: row.pais,
      codigoPostal: row.codigo_postal,
      latitud: row.latitud ? parseFloat(row.latitud) : null,
      longitud: row.longitud ? parseFloat(row.longitud) : null,
      zonaHoraria: row.zona_horaria,
      moneda: row.moneda,
      idioma: row.idioma,
      activo: row.activo === 1 || row.activo === true,
      estadoSuscripcion: row.estado_suscripcion,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
      fechaEliminacion: row.fecha_eliminacion,
    };
  }

  /**
   * Obtiene todos los restaurantes con paginación y filtros
   */
  async obtenerTodos(query: QueryRestauranteDto): Promise<PaginatedRestaurantes> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const condiciones: string[] = ['r.fecha_eliminacion IS NULL'];
    const parametros: any[] = [];
    let indice = 0;

    if (query.nombre) {
      condiciones.push(`r.nombre LIKE @${indice}`);
      parametros.push(`%${query.nombre}%`);
      indice++;
    }

    if (query.slug) {
      condiciones.push(`r.slug = @${indice}`);
      parametros.push(query.slug);
      indice++;
    }

    if (query.activo !== undefined) {
      condiciones.push(`r.activo = @${indice}`);
      parametros.push(query.activo ? 1 : 0);
      indice++;
    }

    if (query.estadoSuscripcion) {
      condiciones.push(`r.estado_suscripcion = @${indice}`);
      parametros.push(query.estadoSuscripcion);
      indice++;
    }

    if (query.ciudad) {
      condiciones.push(`r.ciudad = @${indice}`);
      parametros.push(query.ciudad);
      indice++;
    }

    if (query.pais) {
      condiciones.push(`r.pais = @${indice}`);
      parametros.push(query.pais);
      indice++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countResult = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM restaurantes r
      ${whereClause}
    `, parametros);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Obtener restaurantes
    parametros.push(limit, offset);
    const restaurantes = await AppDataSource.query(`
      SELECT 
        r.id, r.nombre, r.slug, r.correo, r.telefono,
        r.biografia, r.imagen_perfil_url, r.imagen_portada_url,
        r.color_tema, r.color_texto, r.color_fondo, r.familia_fuente,
        r.mostrar_menu, r.mostrar_enlaces, r.mostrar_contacto, r.habilitar_pedidos,
        r.direccion, r.ciudad, r.estado_provincia, r.pais, r.codigo_postal,
        r.latitud, r.longitud,
        r.zona_horaria, r.moneda, r.idioma,
        r.activo, r.estado_suscripcion,
        r.fecha_creacion, r.fecha_actualizacion, r.fecha_eliminacion
      FROM restaurantes r
      ${whereClause}
      ORDER BY r.fecha_creacion DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `, parametros.slice(0, -2).concat([limit, offset]));

    return {
      items: restaurantes.map((r: any) => this.mapToRestaurante(r)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Obtiene un restaurante por ID
   */
  async obtenerPorId(restauranteId: string): Promise<Restaurante | null> {
    const restaurantes = await AppDataSource.query(`
      SELECT 
        r.id, r.nombre, r.slug, r.correo, r.telefono,
        r.biografia, r.imagen_perfil_url, r.imagen_portada_url,
        r.color_tema, r.color_texto, r.color_fondo, r.familia_fuente,
        r.mostrar_menu, r.mostrar_enlaces, r.mostrar_contacto, r.habilitar_pedidos,
        r.direccion, r.ciudad, r.estado_provincia, r.pais, r.codigo_postal,
        r.latitud, r.longitud,
        r.zona_horaria, r.moneda, r.idioma,
        r.activo, r.estado_suscripcion,
        r.fecha_creacion, r.fecha_actualizacion, r.fecha_eliminacion
      FROM restaurantes r
      WHERE r.id = @0 AND r.fecha_eliminacion IS NULL
    `, [restauranteId]);

    if (!restaurantes || restaurantes.length === 0) {
      return null;
    }

    return this.mapToRestaurante(restaurantes[0]);
  }

  /**
   * Obtiene un restaurante por slug (para páginas públicas)
   */
  async obtenerPorSlug(slug: string): Promise<Restaurante | null> {
    const restaurantes = await AppDataSource.query(`
      SELECT 
        r.id, r.nombre, r.slug, r.correo, r.telefono,
        r.biografia, r.imagen_perfil_url, r.imagen_portada_url,
        r.color_tema, r.color_texto, r.color_fondo, r.familia_fuente,
        r.mostrar_menu, r.mostrar_enlaces, r.mostrar_contacto, r.habilitar_pedidos,
        r.direccion, r.ciudad, r.estado_provincia, r.pais, r.codigo_postal,
        r.latitud, r.longitud,
        r.zona_horaria, r.moneda, r.idioma,
        r.activo, r.estado_suscripcion,
        r.fecha_creacion, r.fecha_actualizacion, r.fecha_eliminacion
      FROM restaurantes r
      WHERE r.slug = @0 AND r.fecha_eliminacion IS NULL AND r.activo = 1
    `, [slug]);

    if (!restaurantes || restaurantes.length === 0) {
      return null;
    }

    return this.mapToRestaurante(restaurantes[0]);
  }

  /**
   * Obtiene todos los restaurantes activos (público, solo información básica)
   */
  async obtenerTodosPublicos(): Promise<Restaurante[]> {
    const restaurantes = await AppDataSource.query(`
      SELECT 
        r.id, r.nombre, r.slug, 
        NULL as correo, r.telefono,
        r.biografia, r.imagen_perfil_url, r.imagen_portada_url,
        r.color_tema, r.color_texto, r.color_fondo, r.familia_fuente,
        r.mostrar_menu, r.mostrar_enlaces, r.mostrar_contacto, r.habilitar_pedidos,
        r.direccion, r.ciudad, r.estado_provincia, r.pais, r.codigo_postal,
        r.latitud, r.longitud,
        r.zona_horaria, r.moneda, r.idioma,
        r.activo, r.estado_suscripcion,
        r.fecha_creacion, r.fecha_actualizacion, r.fecha_eliminacion
      FROM restaurantes r
      WHERE r.fecha_eliminacion IS NULL AND r.activo = 1
      ORDER BY r.nombre ASC
    `);

    return restaurantes.map((r: any) => this.mapToRestaurante(r));
  }

  /**
   * Crea un nuevo restaurante
   */
  async crear(
    crearRestauranteDto: CrearRestauranteDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Restaurante> {
    // Verificar que el slug no exista
    const slugExiste = await AppDataSource.query(`
      SELECT id FROM restaurantes WHERE slug = @0 AND fecha_eliminacion IS NULL
    `, [crearRestauranteDto.slug]);

    if (slugExiste && slugExiste.length > 0) {
      this.handleError('Ya existe un restaurante con ese slug', null, 409);
    }

    // Verificar que el correo no exista
    const correoExiste = await AppDataSource.query(`
      SELECT id FROM restaurantes WHERE correo = @0 AND fecha_eliminacion IS NULL
    `, [crearRestauranteDto.correo]);

    if (correoExiste && correoExiste.length > 0) {
      this.handleError('Ya existe un restaurante con ese correo', null, 409);
    }

    // Obtener fecha actual en hora local de Montería
    const fechaActual = getMonteriaLocalDate();

    // Crear el restaurante
    const resultado = await AppDataSource.query(`
      INSERT INTO restaurantes (
        nombre, slug, correo, telefono,
        biografia, imagen_perfil_url, imagen_portada_url,
        color_tema, color_texto, color_fondo, familia_fuente,
        mostrar_menu, mostrar_enlaces, mostrar_contacto, habilitar_pedidos,
        direccion, ciudad, estado_provincia, pais, codigo_postal,
        latitud, longitud,
        zona_horaria, moneda, idioma,
        activo, estado_suscripcion,
        fecha_creacion, fecha_actualizacion
      )
      OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.slug, INSERTED.correo, INSERTED.telefono,
        INSERTED.biografia, INSERTED.imagen_perfil_url, INSERTED.imagen_portada_url,
        INSERTED.color_tema, INSERTED.color_texto, INSERTED.color_fondo, INSERTED.familia_fuente,
        INSERTED.mostrar_menu, INSERTED.mostrar_enlaces, INSERTED.mostrar_contacto, INSERTED.habilitar_pedidos,
        INSERTED.direccion, INSERTED.ciudad, INSERTED.estado_provincia, INSERTED.pais, INSERTED.codigo_postal,
        INSERTED.latitud, INSERTED.longitud,
        INSERTED.zona_horaria, INSERTED.moneda, INSERTED.idioma,
        INSERTED.activo, INSERTED.estado_suscripcion,
        INSERTED.fecha_creacion, INSERTED.fecha_actualizacion, INSERTED.fecha_eliminacion
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10,
        @11, @12, @13, @14, @15, @16, @17, @18, @19, @20, @21,
        @22, @23, @24, @25, @26, @27, @28
      )
    `, [
      crearRestauranteDto.nombre,
      crearRestauranteDto.slug,
      crearRestauranteDto.correo,
      crearRestauranteDto.telefono || null,
      crearRestauranteDto.biografia || null,
      crearRestauranteDto.imagenPerfilUrl || null,
      crearRestauranteDto.imagenPortadaUrl || null,
      crearRestauranteDto.colorTema || '#000000',
      crearRestauranteDto.colorTexto || '#FFFFFF',
      crearRestauranteDto.colorFondo || '#FFFFFF',
      crearRestauranteDto.familiaFuente || 'Arial',
      crearRestauranteDto.mostrarMenu !== undefined ? (crearRestauranteDto.mostrarMenu ? 1 : 0) : 1,
      crearRestauranteDto.mostrarEnlaces !== undefined ? (crearRestauranteDto.mostrarEnlaces ? 1 : 0) : 1,
      crearRestauranteDto.mostrarContacto !== undefined ? (crearRestauranteDto.mostrarContacto ? 1 : 0) : 1,
      crearRestauranteDto.habilitarPedidos !== undefined ? (crearRestauranteDto.habilitarPedidos ? 1 : 0) : 1,
      crearRestauranteDto.direccion || null,
      crearRestauranteDto.ciudad || null,
      crearRestauranteDto.estadoProvincia || null,
      crearRestauranteDto.pais || null,
      crearRestauranteDto.codigoPostal || null,
      crearRestauranteDto.latitud || null,
      crearRestauranteDto.longitud || null,
      crearRestauranteDto.zonaHoraria || 'UTC',
      crearRestauranteDto.moneda || 'USD',
      crearRestauranteDto.idioma || 'es',
      1, // activo por defecto
      'free', // estado_suscripcion por defecto (plan free permanente)
      fechaActual, // fecha_creacion en hora local de Montería
      fechaActual, // fecha_actualizacion en hora local de Montería
    ]);

    if (!resultado || resultado.length === 0) {
      this.handleError('Error al crear el restaurante', null, 500);
    }

    const nuevoRestaurante = resultado[0];
    const restauranteMapeado = this.mapToRestaurante(nuevoRestaurante);

    // Si el usuario que crea el restaurante no tiene restaurante asignado, asociarlo y darle rol de Administrador
    if (usuarioId) {
      const usuarioActual = await AppDataSource.query(
        `SELECT id, restaurante_id FROM usuarios WHERE id = @0 AND fecha_eliminacion IS NULL`,
        [usuarioId]
      );

      if (usuarioActual && usuarioActual.length > 0 && !usuarioActual[0].restaurante_id) {
        // Actualizar el usuario con el restaurante_id
        await AppDataSource.query(
          `UPDATE usuarios SET restaurante_id = @0, fecha_actualizacion = @1 WHERE id = @2`,
          [restauranteMapeado.id, fechaActual, usuarioId]
        );

        // Obtener el rol "Administrador"
        const adminRole = await AppDataSource.query(
          `SELECT id FROM roles WHERE nombre = 'Administrador'`
        );

        if (adminRole && adminRole.length > 0) {
          // Verificar si el usuario ya tiene un rol asignado para este restaurante
          const rolExistente = await AppDataSource.query(
            `SELECT id FROM roles_usuario WHERE usuario_id = @0 AND restaurante_id = @1`,
            [usuarioId, restauranteMapeado.id]
          );

          if (!rolExistente || rolExistente.length === 0) {
            // Asignar el rol de Administrador
            await AppDataSource.query(
              `INSERT INTO roles_usuario (usuario_id, rol_id, restaurante_id) VALUES (@0, @1, @2)`,
              [usuarioId, adminRole[0].id, restauranteMapeado.id]
            );

            this.logger.info('Usuario asociado al restaurante y rol de Administrador asignado', {
              categoria: this.logCategory,
              usuarioId,
              restauranteId: restauranteMapeado.id,
              detalle: { rolId: adminRole[0].id },
            });
          }
        }
      }
    }

    // Crear suscripción FREE automáticamente
    const { SuscripcionesService } = await import('./suscripciones.service');
    const suscripcionesService = new SuscripcionesService();
    try {
      await suscripcionesService.crear({
        restauranteId: restauranteMapeado.id,
        tipoPlan: 'free',
      }, usuarioId, requestInfo);
    } catch (error: any) {
      // Si falla la creación de suscripción, loguear pero no fallar la creación del restaurante
      this.logger.warn('Error al crear suscripción FREE automática', {
        categoria: this.logCategory,
        restauranteId: restauranteMapeado.id,
        detalle: { error: error.message },
      });
    }

    this.logger.info('Restaurante creado exitosamente', {
      categoria: this.logCategory,
      restauranteId: nuevoRestaurante.id,
      usuarioId: usuarioId,
      entidadTipo: 'restaurante',
      entidadId: nuevoRestaurante.id,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 201,
      detalle: {
        nombre: restauranteMapeado.nombre,
        slug: restauranteMapeado.slug,
        correo: restauranteMapeado.correo,
        telefono: restauranteMapeado.telefono,
        activo: restauranteMapeado.activo,
        estadoSuscripcion: restauranteMapeado.estadoSuscripcion,
        ciudad: restauranteMapeado.ciudad,
        pais: restauranteMapeado.pais,
      },
      metadata: {
        tipoOperacion: 'crear_restaurante',
        camposProporcionados: Object.keys(crearRestauranteDto),
        timestamp: new Date().toISOString(),
      },
    });

    return restauranteMapeado;
  }

  /**
   * Actualiza un restaurante
   */
  async actualizar(
    restauranteId: string,
    actualizarRestauranteDto: ActualizarRestauranteDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Restaurante> {
    const restaurante = await this.obtenerPorId(restauranteId);
    if (!restaurante) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    // Verificar que el slug no esté en uso por otro restaurante
    if (actualizarRestauranteDto.slug && actualizarRestauranteDto.slug !== restaurante!.slug) {
      const slugExiste = await AppDataSource.query(`
        SELECT id FROM restaurantes WHERE slug = @0 AND id != @1 AND fecha_eliminacion IS NULL
      `, [actualizarRestauranteDto.slug, restauranteId]);

      if (slugExiste && slugExiste.length > 0) {
        this.handleError('Ya existe otro restaurante con ese slug', null, 409);
      }
    }

    // Verificar que el correo no esté en uso por otro restaurante
    if (actualizarRestauranteDto.correo && actualizarRestauranteDto.correo !== restaurante!.correo) {
      const correoExiste = await AppDataSource.query(`
        SELECT id FROM restaurantes WHERE correo = @0 AND id != @1 AND fecha_eliminacion IS NULL
      `, [actualizarRestauranteDto.correo, restauranteId]);

      if (correoExiste && correoExiste.length > 0) {
        this.handleError('Ya existe otro restaurante con ese correo', null, 409);
      }
    }

    // Construir la consulta UPDATE dinámicamente
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;

    if (actualizarRestauranteDto.nombre !== undefined) {
      campos.push(`nombre = @${indice}`);
      valores.push(actualizarRestauranteDto.nombre);
      indice++;
    }

    if (actualizarRestauranteDto.slug !== undefined) {
      campos.push(`slug = @${indice}`);
      valores.push(actualizarRestauranteDto.slug);
      indice++;
    }

    if (actualizarRestauranteDto.correo !== undefined) {
      campos.push(`correo = @${indice}`);
      valores.push(actualizarRestauranteDto.correo);
      indice++;
    }

    if (actualizarRestauranteDto.telefono !== undefined) {
      campos.push(`telefono = @${indice}`);
      valores.push(actualizarRestauranteDto.telefono);
      indice++;
    }

    if (actualizarRestauranteDto.biografia !== undefined) {
      campos.push(`biografia = @${indice}`);
      valores.push(actualizarRestauranteDto.biografia);
      indice++;
    }

    if (actualizarRestauranteDto.imagenPerfilUrl !== undefined) {
      campos.push(`imagen_perfil_url = @${indice}`);
      valores.push(actualizarRestauranteDto.imagenPerfilUrl);
      indice++;
    }

    if (actualizarRestauranteDto.imagenPortadaUrl !== undefined) {
      campos.push(`imagen_portada_url = @${indice}`);
      valores.push(actualizarRestauranteDto.imagenPortadaUrl);
      indice++;
    }

    if (actualizarRestauranteDto.colorTema !== undefined) {
      campos.push(`color_tema = @${indice}`);
      valores.push(actualizarRestauranteDto.colorTema);
      indice++;
    }

    if (actualizarRestauranteDto.colorTexto !== undefined) {
      campos.push(`color_texto = @${indice}`);
      valores.push(actualizarRestauranteDto.colorTexto);
      indice++;
    }

    if (actualizarRestauranteDto.colorFondo !== undefined) {
      campos.push(`color_fondo = @${indice}`);
      valores.push(actualizarRestauranteDto.colorFondo);
      indice++;
    }

    if (actualizarRestauranteDto.familiaFuente !== undefined) {
      campos.push(`familia_fuente = @${indice}`);
      valores.push(actualizarRestauranteDto.familiaFuente);
      indice++;
    }

    if (actualizarRestauranteDto.mostrarMenu !== undefined) {
      campos.push(`mostrar_menu = @${indice}`);
      valores.push(actualizarRestauranteDto.mostrarMenu ? 1 : 0);
      indice++;
    }

    if (actualizarRestauranteDto.mostrarEnlaces !== undefined) {
      campos.push(`mostrar_enlaces = @${indice}`);
      valores.push(actualizarRestauranteDto.mostrarEnlaces ? 1 : 0);
      indice++;
    }

    if (actualizarRestauranteDto.mostrarContacto !== undefined) {
      campos.push(`mostrar_contacto = @${indice}`);
      valores.push(actualizarRestauranteDto.mostrarContacto ? 1 : 0);
      indice++;
    }

    if (actualizarRestauranteDto.habilitarPedidos !== undefined) {
      campos.push(`habilitar_pedidos = @${indice}`);
      valores.push(actualizarRestauranteDto.habilitarPedidos ? 1 : 0);
      indice++;
    }

    if (actualizarRestauranteDto.direccion !== undefined) {
      campos.push(`direccion = @${indice}`);
      valores.push(actualizarRestauranteDto.direccion);
      indice++;
    }

    if (actualizarRestauranteDto.ciudad !== undefined) {
      campos.push(`ciudad = @${indice}`);
      valores.push(actualizarRestauranteDto.ciudad);
      indice++;
    }

    if (actualizarRestauranteDto.estadoProvincia !== undefined) {
      campos.push(`estado_provincia = @${indice}`);
      valores.push(actualizarRestauranteDto.estadoProvincia);
      indice++;
    }

    if (actualizarRestauranteDto.pais !== undefined) {
      campos.push(`pais = @${indice}`);
      valores.push(actualizarRestauranteDto.pais);
      indice++;
    }

    if (actualizarRestauranteDto.codigoPostal !== undefined) {
      campos.push(`codigo_postal = @${indice}`);
      valores.push(actualizarRestauranteDto.codigoPostal);
      indice++;
    }

    if (actualizarRestauranteDto.latitud !== undefined) {
      campos.push(`latitud = @${indice}`);
      valores.push(actualizarRestauranteDto.latitud);
      indice++;
    }

    if (actualizarRestauranteDto.longitud !== undefined) {
      campos.push(`longitud = @${indice}`);
      valores.push(actualizarRestauranteDto.longitud);
      indice++;
    }

    if (actualizarRestauranteDto.zonaHoraria !== undefined) {
      campos.push(`zona_horaria = @${indice}`);
      valores.push(actualizarRestauranteDto.zonaHoraria);
      indice++;
    }

    if (actualizarRestauranteDto.moneda !== undefined) {
      campos.push(`moneda = @${indice}`);
      valores.push(actualizarRestauranteDto.moneda);
      indice++;
    }

    if (actualizarRestauranteDto.idioma !== undefined) {
      campos.push(`idioma = @${indice}`);
      valores.push(actualizarRestauranteDto.idioma);
      indice++;
    }

    if (actualizarRestauranteDto.activo !== undefined) {
      campos.push(`activo = @${indice}`);
      valores.push(actualizarRestauranteDto.activo ? 1 : 0);
      indice++;
    }

    if (actualizarRestauranteDto.estadoSuscripcion !== undefined) {
      campos.push(`estado_suscripcion = @${indice}`);
      valores.push(actualizarRestauranteDto.estadoSuscripcion);
      indice++;
    }

    if (campos.length === 0) {
      return restaurante!;
    }

    // Agregar fecha_actualizacion en hora local de Montería
    const fechaActual = getMonteriaLocalDate();
    campos.push(`fecha_actualizacion = @${indice}`);
    valores.push(fechaActual);
    indice++;

    valores.push(restauranteId);

    await AppDataSource.query(`
      UPDATE restaurantes
      SET ${campos.join(', ')}
      WHERE id = @${indice}
    `, valores);

    const restauranteActualizado = await this.obtenerPorId(restauranteId) as Restaurante;

    // Preparar información de cambios
    const camposActualizados = Object.keys(actualizarRestauranteDto).filter(
      key => actualizarRestauranteDto[key as keyof ActualizarRestauranteDto] !== undefined
    );

    this.logger.info('Restaurante actualizado exitosamente', {
      categoria: this.logCategory,
      restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'restaurante',
      entidadId: restauranteId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        nombre: restauranteActualizado.nombre,
        slug: restauranteActualizado.slug,
        camposActualizados: camposActualizados,
        valoresAnteriores: restaurante ? {
          nombre: restaurante.nombre,
          slug: restaurante.slug,
          activo: restaurante.activo,
          estadoSuscripcion: restaurante.estadoSuscripcion,
        } : null,
        valoresNuevos: actualizarRestauranteDto,
      },
      metadata: {
        tipoOperacion: 'actualizar_restaurante',
        camposModificados: camposActualizados,
        cantidadCamposModificados: camposActualizados.length,
        timestamp: new Date().toISOString(),
      },
    });

    return restauranteActualizado;
  }

  /**
   * Elimina un restaurante (soft delete)
   */
  async eliminar(
    restauranteId: string,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<void> {
    const restaurante = await this.obtenerPorId(restauranteId);
    if (!restaurante) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    // Soft delete: marcar fecha_eliminacion en hora local de Montería
    const fechaActual = getMonteriaLocalDate();
    await AppDataSource.query(`
      UPDATE restaurantes
      SET fecha_eliminacion = @0, activo = 0, fecha_actualizacion = @0
      WHERE id = @1
    `, [fechaActual, restauranteId]);

    this.logger.info('Restaurante eliminado exitosamente', {
      categoria: this.logCategory,
      restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'restaurante',
      entidadId: restauranteId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        nombre: restaurante!.nombre,
        slug: restaurante!.slug,
        correo: restaurante!.correo,
        activo: restaurante!.activo,
        estadoSuscripcion: restaurante!.estadoSuscripcion,
        ciudad: restaurante!.ciudad,
        pais: restaurante!.pais,
        fechaEliminacion: new Date().toISOString(),
      },
      metadata: {
        tipoOperacion: 'eliminar_restaurante',
        tipoEliminacion: 'soft_delete',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

