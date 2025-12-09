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
      const merchantUrl = `${this.apiUrl}/merchants/${this.config.publicKey}`;
      
      Logger.info('Obteniendo acceptance_token de Wompi', {
        categoria: this.logCategory,
        detalle: {
          environment: this.config.environment,
          apiUrl: this.apiUrl,
          merchantUrl: merchantUrl,
          publicKeyPrefix: this.config.publicKey.substring(0, 15),
        },
      });
      
      const response = await fetch(merchantUrl, {
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
        detalle: { 
          expiresIn: '1 hora',
          environment: this.config.environment,
          apiUrl: this.apiUrl,
          publicKeyPrefix: this.config.publicKey.substring(0, 15),
          acceptanceTokenPrefix: acceptanceToken.substring(0, 30),
        },
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
      let cardData: any;
      try {
        cardData = JSON.parse(cardDataJson);
      } catch (parseError) {
        Logger.error('Error al parsear datos de tarjeta', parseError instanceof Error ? parseError : new Error(String(parseError)), {
          categoria: this.logCategory,
          detalle: { cardDataJson: cardDataJson.substring(0, 100) },
        });
        throw new Error('Formato de datos de tarjeta inválido');
      }
      
      // Validar que los campos requeridos estén presentes
      if (!cardData.number || !cardData.cvc || !cardData.exp_month || !cardData.exp_year) {
        throw new Error('Faltan campos requeridos en los datos de la tarjeta');
      }
      
      // Obtener acceptance_token de Wompi dinámicamente (método recomendado)
      const acceptanceToken = await this.getAcceptanceToken();
      
      // Log del ambiente y configuración para debugging
      Logger.info('Creando token de tarjeta en Wompi', {
        categoria: this.logCategory,
        detalle: {
          environment: this.config.environment,
          apiUrl: this.apiUrl,
          publicKeyPrefix: this.config.publicKey.substring(0, 12),
          privateKeyPrefix: this.config.privateKey.substring(0, 12),
          hasAcceptanceToken: !!acceptanceToken,
          cardNumberLast4: cardData.number.toString().slice(-4),
        },
      });
      
      // Wompi requiere la llave PÚBLICA para tokenizar tarjetas (no la privada)
      // La llave privada solo se usa para crear transacciones
      // https://docs.wompi.co/docs/colombia/fuentes-de-pago/
      const response = await fetch(`${this.apiUrl}/tokens/cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.publicKey}`, // Usar llave PÚBLICA, no privada
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: cardData.number,
          cvc: cardData.cvc,
          exp_month: cardData.exp_month,
          exp_year: cardData.exp_year,
          card_holder: cardData.card_holder,
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
    reference: string,
    customerPhone?: string
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

       // Validar que el tokenId sea un string válido
       if (typeof tokenId !== 'string' || !tokenId.trim()) {
         throw new Error('Token de tarjeta inválido. Debe ser un string no vacío.');
       }

       // Validar que el tokenId no sea el JSON original (debe ser un token de Wompi)
       // Los tokens de Wompi son strings que no empiezan con '{'
       if (tokenId.trim().startsWith('{')) {
         Logger.error('El tokenId parece ser un JSON en lugar de un token válido de Wompi', new Error('Token inválido'), {
           categoria: this.logCategory,
           detalle: {
             tokenId: tokenId.substring(0, 100) + '...',
             tokenLength: tokenId.length,
           },
         });
         throw new Error('Token inválido. El token debe ser generado por Wompi, no un objeto JSON.');
       }

       // Construir el body según la documentación oficial de Wompi
       // https://docs.wompi.co/docs/colombia/referencia-api/
       // El payment_method debe incluir type, token e installments
       const requestBody: any = {
         acceptance_token: acceptanceToken,
         amount_in_cents: amountInCents,
         currency: 'COP',
         customer_email: customerEmail,
         reference: reference,
         payment_method: {
           type: 'CARD',
           token: tokenId.trim(), // Asegurar que sea string sin espacios
           installments: 1, // Wompi requiere installments y debe ser >= 1
         },
       };

      // Agregar customer_data solo si tenemos teléfono (opcional según Wompi)
      if (customerPhone) {
        requestBody.customer_data = {
          phone_number: customerPhone,
          full_name: customerName || 'Cliente',
        };
      }

       Logger.info('Creando transacción en Wompi', {
         categoria: this.logCategory,
         detalle: {
           amount_in_cents: amountInCents,
           reference: reference,
           hasToken: !!tokenId,
           tokenType: typeof tokenId,
           tokenLength: tokenId?.length || 0,
           hasAcceptanceToken: !!acceptanceToken,
           hasPhone: !!customerPhone,
           paymentMethodType: requestBody.payment_method?.type,
           paymentMethodToken: requestBody.payment_method?.token?.substring(0, 20) + '...', // Solo primeros caracteres por seguridad
         },
       });
       
       // Validar que el requestBody esté correctamente formateado
       const requestBodyString = JSON.stringify(requestBody);
       if (!requestBodyString || requestBodyString.includes('[object Object]')) {
         throw new Error('Error al construir el body de la petición. El payment_method no está correctamente formateado.');
       }

      const response = await fetch(`${this.apiUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.privateKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
              customer_name: customerName,
              reference: reference,
              hasToken: !!tokenId,
              hasAcceptanceToken: !!acceptanceToken,
              hasPhone: !!customerPhone,
            },
          },
        });

        // Construir mensaje de error detallado y amigable
        let errorMessage = '';

        if (response.status === 422) {
          // Error 422: Unprocessable Entity - datos inválidos o faltantes
          if (errorObj.error?.messages) {
            // Si Wompi devuelve un objeto con mensajes detallados
            const messages = Object.entries(errorObj.error.messages)
              .map(([field, msg]) => `${field}: ${msg}`)
              .join(', ');
            errorMessage = `Datos inválidos - ${messages}`;
          } else if (errorObj.error?.message) {
            errorMessage = errorObj.error.message;
          } else if (errorObj.message) {
            errorMessage = errorObj.message;
          } else {
            errorMessage = 'Datos inválidos o faltantes. Verifica que el restaurante tenga email y teléfono válidos.';
          }
        } else {
          // Otros errores
          errorMessage = errorObj.error?.message ||
                        errorObj.message ||
                        errorObj.error?.reason ||
                        `Error ${response.status}: ${response.statusText}`;
        }

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
    restauranteId: string,
    customerPhone?: string
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
      reference,
      customerPhone
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

