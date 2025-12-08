import crypto from 'crypto';
import { BaseService } from './base.service';
import { LogCategory, Logger } from '../utils/logger';
import { getWompiConfig, getWompiApiUrl, getWompiPlanPrice, PaymentProvider } from '../config/wompi.config';
import { PlanType } from '../config/stripe.config';

export interface WompiTokenResponse {
  data: {
    id: string;
    status: string;
    card?: {
      bin: string;
      exp_month: string;
      exp_year: string;
      holder_name: string;
      last_four: string;
    };
  };
}

export interface WompiTransactionResponse {
  data: {
    id: string;
    status: string;
    amount_in_cents: number;
    currency: string;
    payment_method_type: string;
    created_at: string;
    finalized_at?: string;
  };
}

export interface WompiSubscriptionResponse {
  id: string;
  status: string;
  amount_in_cents: number;
  currency: string;
  customer_email: string;
  created_at: string;
}

/**
 * Servicio para interactuar con la API de Wompi
 * Nota: Esta implementación es un template básico. 
 * Debes ajustar según la documentación oficial de Wompi para suscripciones recurrentes.
 */
interface WompiMerchantResponse {
  data: {
    presigned_acceptance: {
      acceptance_token: string;
      permalink: string;
      type: string;
    };
  };
}

export class WompiService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;
  private apiUrl: string;
  private config: ReturnType<typeof getWompiConfig>;
  private cachedAcceptanceToken: { token: string; expiresAt: number } | null = null;

  constructor() {
    super();
    this.config = getWompiConfig();
    this.apiUrl = getWompiApiUrl();
  }

  /**
   * Obtiene el acceptance_token desde la API de Wompi
   * Este es el método recomendado según la documentación oficial de Wompi
   * El token se cachea por 1 hora para evitar hacer muchas peticiones
   */
  async getAcceptanceToken(): Promise<string> {
    // Si hay un token en caché válido, retornarlo
    if (this.cachedAcceptanceToken && this.cachedAcceptanceToken.expiresAt > Date.now()) {
      return this.cachedAcceptanceToken.token;
    }

    try {
      // Obtener acceptance_token desde la API de Wompi usando la llave pública
      // Endpoint: GET /merchants/:public_key
      const response = await fetch(`${this.apiUrl}/merchants/${this.config.publicKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error('Error al obtener acceptance_token de Wompi', new Error(errorText), {
          categoria: this.logCategory,
          detalle: { status: response.status, statusText: response.statusText },
        });
        throw new Error(`Error al obtener acceptance_token: ${response.status}`);
      }

      const data = await response.json() as WompiMerchantResponse;
      
      if (!data.data?.presigned_acceptance?.acceptance_token) {
        throw new Error('No se encontró acceptance_token en la respuesta de Wompi');
      }

      const acceptanceToken = data.data.presigned_acceptance.acceptance_token;
      
      // Cachear el token por 1 hora (3,600,000 ms)
      this.cachedAcceptanceToken = {
        token: acceptanceToken,
        expiresAt: Date.now() + (60 * 60 * 1000),
      };

      Logger.info('Acceptance_token obtenido exitosamente desde Wompi', {
        categoria: this.logCategory,
        detalle: { expiresIn: '1 hora' },
      });

      return acceptanceToken;
    } catch (error: any) {
      Logger.error('Error al obtener acceptance_token de Wompi', error instanceof Error ? error : new Error(String(error)), {
        categoria: this.logCategory,
      });
      
      // Si falla, intentar usar el token del .env como fallback
      const envToken = process.env.WOMPI_ACCEPTANCE_TOKEN;
      if (envToken) {
        Logger.warn('Usando WOMPI_ACCEPTANCE_TOKEN del .env como fallback', {
          categoria: this.logCategory,
        });
        return envToken;
      }
      
      throw new Error('No se pudo obtener el acceptance_token. Verifica que WOMPI_PUBLIC_KEY esté configurado correctamente o configura WOMPI_ACCEPTANCE_TOKEN en el .env como fallback.');
    }
  }

  /**
   * Crea un token de tarjeta en Wompi
   * Wompi requiere tokenizar la tarjeta antes de usarla
   */
  async createToken(cardDataJson: string): Promise<string> {
    try {
      // Parsear datos de la tarjeta
      const cardData = JSON.parse(cardDataJson);
      
      // Obtener acceptance_token de Wompi dinámicamente (método recomendado)
      const acceptanceToken = await this.getAcceptanceToken();
      
      // Wompi requiere un acceptance_token para tokenizar tarjetas
      // Ajustar según la documentación oficial de Wompi
      const response = await fetch(`${this.apiUrl}/tokens/cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.privateKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: cardData.number,
          cvc: cardData.cvc,
          exp_month: cardData.exp_month,
          exp_year: cardData.exp_year,
          card_holder: cardData.card_holder,
          acceptance_token: acceptanceToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorObj: any;
        try {
          errorObj = JSON.parse(errorText);
        } catch {
          errorObj = { message: errorText || `Error desconocido: ${response.status}` };
        }
        
        Logger.error('Error detallado de Wompi al crear token', new Error(JSON.stringify(errorObj)), {
          categoria: this.logCategory,
          detalle: {
            status: response.status,
            statusText: response.statusText,
            error: errorObj,
          },
        });
        
        const errorMessage = errorObj.error?.message || 
                            errorObj.message || 
                            errorObj.error?.reason ||
                            `Error al crear token en Wompi: ${response.status}`;
        
        throw new Error(`Error al crear token en Wompi: ${errorMessage}`);
      }

      const data = await response.json() as WompiTokenResponse;
      
      if (!data.data || !data.data.id) {
        throw new Error('Respuesta inválida de Wompi al crear token');
      }
      
      return data.data.id;
    } catch (error: any) {
      Logger.error('Error al crear token en Wompi', error instanceof Error ? error : new Error(String(error)), {
        categoria: this.logCategory,
      });
      throw error;
    }
  }

  /**
   * Crea una transacción única en Wompi
   * Para suscripciones, Wompi puede requerir un enfoque diferente
   */
  async createTransaction(
    tokenId: string,
    amountInCents: number,
    customerEmail: string,
    customerName: string,
    reference: string
  ): Promise<WompiTransactionResponse> {
    try {
      // Validar que el token existe
      if (!tokenId) {
        throw new Error('Token de tarjeta requerido para crear transacción');
      }
      
      // Obtener acceptance_token de Wompi dinámicamente (método recomendado)
      // Si falla, usar el token del .env como fallback
      const acceptanceToken = await this.getAcceptanceToken();
      
      // Validar datos requeridos
      if (!customerEmail || !customerEmail.includes('@')) {
        throw new Error('Email de cliente inválido');
      }
      
      if (amountInCents <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }
      
      const response = await fetch(`${this.apiUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.privateKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount_in_cents: amountInCents,
          currency: 'COP',
          customer_email: customerEmail,
          payment_method: {
            type: 'CARD',
            token: tokenId,
            installments: 1,
          },
          reference: reference,
          acceptance_token: acceptanceToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorObj: any;
        try {
          errorObj = JSON.parse(errorText);
        } catch {
          errorObj = { message: errorText || `Error desconocido: ${response.status}` };
        }
        
        // Log detallado del error
        Logger.error('Error detallado de Wompi al crear transacción', new Error(JSON.stringify(errorObj)), {
          categoria: this.logCategory,
          detalle: {
            status: response.status,
            statusText: response.statusText,
            error: errorObj,
            requestData: {
              amount_in_cents: amountInCents,
              currency: 'COP',
              customer_email: customerEmail,
              reference: reference,
              hasToken: !!tokenId,
              hasAcceptanceToken: !!acceptanceToken,
            },
          },
        });
        
        // Construir mensaje de error más descriptivo
        const errorMessage = errorObj.error?.message || 
                            errorObj.message || 
                            errorObj.error?.reason ||
                            `Error al crear transacción en Wompi: ${response.status}`;
        
        throw new Error(`Error al crear transacción en Wompi: ${errorMessage}`);
      }

      const data = await response.json() as WompiTransactionResponse;
      
      if (!data.data || !data.data.id) {
        throw new Error('Respuesta inválida de Wompi al crear transacción');
      }
      
      return data;
    } catch (error: any) {
      Logger.error('Error al crear transacción en Wompi', error instanceof Error ? error : new Error(String(error)), {
        categoria: this.logCategory,
      });
      throw error;
    }
  }

  /**
   * Verifica el estado de una transacción en Wompi
   */
  async verifyTransaction(transactionId: string): Promise<WompiTransactionResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.privateKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorObj = await response.json().catch(() => ({ message: 'Error desconocido' })) as { message?: string };
        throw new Error(errorObj.message || `Error al verificar transacción en Wompi: ${response.status}`);
      }

      const data = await response.json() as WompiTransactionResponse;
      
      if (!data.data || !data.data.id) {
        throw new Error('Respuesta inválida de Wompi al verificar transacción');
      }
      
      // Verificar integridad de la respuesta usando el secreto de integridad
      if (this.config.integritySecret) {
        await this.verifyTransactionIntegrity(data);
      }
      
      return data;
    } catch (error: any) {
      Logger.error('Error al verificar transacción en Wompi', error instanceof Error ? error : new Error(String(error)), {
        categoria: this.logCategory,
      });
      throw error;
    }
  }

  /**
   * Verifica la integridad de una transacción usando el secreto de integridad
   * Wompi proporciona un campo de firma que puede verificarse
   * 
   * Nota: La implementación exacta depende de cómo Wompi firme las transacciones.
   * Consulta la documentación oficial de Wompi para la implementación correcta.
   */
  private async verifyTransactionIntegrity(transaction: WompiTransactionResponse): Promise<void> {
    // Wompi puede proporcionar un campo 'signature' o 'integrity_checksum' en la respuesta
    // Ejemplo de verificación (ajustar según documentación oficial):
    // const receivedSignature = transaction.data.signature;
    // const expectedSignature = crypto
    //   .createHmac('sha256', this.config.integritySecret)
    //   .update(JSON.stringify(transaction.data))
    //   .digest('hex');
    // 
    // if (receivedSignature !== expectedSignature) {
    //   throw new Error('Firma de integridad inválida');
    // }
    
    // Por ahora, solo logueamos que la verificación está disponible
    Logger.info('Verificación de integridad de transacción Wompi disponible', {
      categoria: this.logCategory,
      detalle: { transactionId: transaction.data.id, note: 'Implementar según documentación oficial de Wompi' },
    });
  }

  /**
   * Crea una suscripción recurrente en Wompi
   * Nota: Wompi puede no tener suscripciones nativas como Stripe.
   * Esta función simula el proceso creando una transacción inicial.
   * Para renovaciones, se requeriría programar pagos recurrentes o usar webhooks.
   */
  async createSubscription(
    tokenId: string,
    planType: PlanType,
    isAnnual: boolean,
    customerEmail: string,
    customerName: string,
    restauranteId: string
  ): Promise<{ transactionId: string; status: string }> {
    if (planType === 'free') {
      throw new Error('No se puede crear suscripción de pago para plan FREE');
    }

    const amountInCents = getWompiPlanPrice(planType, isAnnual) * 100; // Convertir a centavos
    const reference = `SUB_${restauranteId}_${Date.now()}`;

    const transaction = await this.createTransaction(
      tokenId,
      amountInCents,
      customerEmail,
      customerName,
      reference
    );

    return {
      transactionId: transaction.data.id,
      status: transaction.data.status,
    };
  }

  /**
   * Verifica el estado de una suscripción (transacción)
   */
  async getSubscriptionStatus(transactionId: string): Promise<string> {
    const transaction = await this.verifyTransaction(transactionId);
    return transaction.data.status;
  }
}

