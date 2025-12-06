/**
 * Servicio para manejar eventos de WebSocket
 */
import { emitToRestaurante, emitToRol, emitToUsuario, emitToAll } from '../config/socket.config';
import { Logger, LogCategory } from '../utils/logger';
import { AppDataSource } from '../config/database';

export interface PedidoEventData {
  pedido: any;
  restauranteId: string;
  mesaId?: string;
  meseroAsignadoId?: string | null;
}

export interface MesaEventData {
  mesa: any;
  restauranteId: string;
  meseroAsignadoId?: string | null;
}

export class WebSocketService {

  /**
   * Emite evento cuando se crea un nuevo pedido
   */
  async emitNuevoPedido(data: PedidoEventData): Promise<void> {
    try {
      const { pedido, restauranteId, mesaId, meseroAsignadoId } = data;

      // Emitir a todo el restaurante
      emitToRestaurante(restauranteId, 'pedido:nuevo', {
        pedido,
        timestamp: new Date().toISOString(),
      });

      // Obtener rol de Cocina para notificar específicamente
      const rolCocina = await AppDataSource.query(
        `SELECT id FROM roles WHERE nombre = 'Cocina'`
      );

      if (rolCocina && rolCocina.length > 0) {
        const cocinaRolId = rolCocina[0].id;
        // Notificar específicamente a cocina
        emitToRol(cocinaRolId, restauranteId, 'pedido:nuevo:cocina', {
          pedido,
          timestamp: new Date().toISOString(),
          tipo: 'nuevo_pedido',
        });
      }

      // Si hay mesero asignado, notificarle también
      if (meseroAsignadoId) {
        emitToUsuario(meseroAsignadoId, 'pedido:nuevo:mesero', {
          pedido,
          timestamp: new Date().toISOString(),
        });
      }

      Logger.info('Evento WebSocket: Nuevo pedido emitido', {
        categoria: LogCategory.SISTEMA,
        restauranteId,
        detalle: { pedidoId: pedido.id, mesaId },
      });
    } catch (error: any) {
      Logger.error('Error al emitir evento de nuevo pedido', error instanceof Error ? error : new Error(String(error)), {
        categoria: LogCategory.SISTEMA,
        detalle: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  /**
   * Emite evento cuando se actualiza el estado de un pedido
   */
  async emitPedidoActualizado(data: PedidoEventData): Promise<void> {
    try {
      const { pedido, restauranteId, mesaId, meseroAsignadoId } = data;

      // Emitir a todo el restaurante
      emitToRestaurante(restauranteId, 'pedido:actualizado', {
        pedido,
        timestamp: new Date().toISOString(),
      });

      // Si el pedido está listo, notificar al mesero
      if (pedido.estado === 'listo' && meseroAsignadoId) {
        emitToUsuario(meseroAsignadoId, 'pedido:listo', {
          pedido,
          timestamp: new Date().toISOString(),
          tipo: 'pedido_listo',
        });

        // También notificar a todos los meseros del restaurante
        const rolMesero = await AppDataSource.query(
          `SELECT id FROM roles WHERE nombre = 'Mesero'`
        );

        if (rolMesero && rolMesero.length > 0) {
          const meseroRolId = rolMesero[0].id;
          emitToRol(meseroRolId, restauranteId, 'pedido:listo:meseros', {
            pedido,
            timestamp: new Date().toISOString(),
            tipo: 'pedido_listo',
          });
        }
      }

      // Si el pedido está en preparación, notificar a cocina
      if (pedido.estado === 'preparando') {
        const rolCocina = await AppDataSource.query(
          `SELECT id FROM roles WHERE nombre = 'Cocina'`
        );

        if (rolCocina && rolCocina.length > 0) {
          const cocinaRolId = rolCocina[0].id;
          emitToRol(cocinaRolId, restauranteId, 'pedido:preparando', {
            pedido,
            timestamp: new Date().toISOString(),
            tipo: 'pedido_preparando',
          });
        }
      }

      Logger.info('Evento WebSocket: Pedido actualizado emitido', {
        categoria: LogCategory.SISTEMA,
        restauranteId,
        detalle: { pedidoId: pedido.id },
        estado: pedido.estado,
      });
    } catch (error: any) {
      Logger.error('Error al emitir evento de pedido actualizado', error instanceof Error ? error : new Error(String(error)), {
        categoria: LogCategory.SISTEMA,
        detalle: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  /**
   * Emite evento cuando se actualiza el estado de un item del pedido
   */
  async emitItemPedidoActualizado(data: {
    pedido: any;
    item: any;
    restauranteId: string;
    meseroAsignadoId?: string | null;
  }): Promise<void> {
    try {
      const { pedido, item, restauranteId, meseroAsignadoId } = data;

      // Emitir a todo el restaurante
      emitToRestaurante(restauranteId, 'pedido:item:actualizado', {
        pedido,
        item,
        timestamp: new Date().toISOString(),
      });

      // Si el item está listo, notificar al mesero
      if (item.estado === 'listo' && meseroAsignadoId) {
        emitToUsuario(meseroAsignadoId, 'pedido:item:listo', {
          pedido,
          item,
          timestamp: new Date().toISOString(),
          tipo: 'item_listo',
        });
      }

      Logger.info('Evento WebSocket: Item de pedido actualizado emitido', {
        categoria: LogCategory.SISTEMA,
        restauranteId,
        detalle: { pedidoId: pedido.id },
        itemId: item.id,
        estado: item.estado,
      });
    } catch (error: any) {
      Logger.error('Error al emitir evento de item actualizado', error instanceof Error ? error : new Error(String(error)), {
        categoria: LogCategory.SISTEMA,
        detalle: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  /**
   * Emite evento cuando se actualiza el estado de una mesa
   */
  async emitMesaActualizada(data: MesaEventData): Promise<void> {
    try {
      const { mesa, restauranteId, meseroAsignadoId } = data;

      // Emitir a todo el restaurante
      emitToRestaurante(restauranteId, 'mesa:actualizada', {
        mesa,
        timestamp: new Date().toISOString(),
      });

      // Si hay mesero asignado, notificarle
      if (meseroAsignadoId) {
        emitToUsuario(meseroAsignadoId, 'mesa:actualizada:mesero', {
          mesa,
          timestamp: new Date().toISOString(),
        });
      }

      Logger.info('Evento WebSocket: Mesa actualizada emitida', {
        categoria: LogCategory.SISTEMA,
        restauranteId,
        detalle: { mesaId: mesa.id },
      });
    } catch (error: any) {
      Logger.error('Error al emitir evento de mesa actualizada', error instanceof Error ? error : new Error(String(error)), {
        categoria: LogCategory.SISTEMA,
        detalle: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  /**
   * Emite notificación personalizada
   */
  emitNotificacion(usuarioId: string, tipo: string, mensaje: string, datos?: any): void {
    try {
      emitToUsuario(usuarioId, 'notificacion', {
        tipo,
        mensaje,
        datos,
        timestamp: new Date().toISOString(),
      });

      Logger.info('Notificación WebSocket emitida', {
        categoria: LogCategory.SISTEMA,
        usuarioId,
        tipo,
      });
    } catch (error: any) {
      Logger.error('Error al emitir notificación', error instanceof Error ? error : new Error(String(error)), {
        categoria: LogCategory.SISTEMA,
        detalle: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }
}

export const webSocketService = new WebSocketService();

