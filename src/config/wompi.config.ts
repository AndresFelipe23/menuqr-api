/**
 * Configuración de Wompi para pagos y suscripciones
 * Wompi es una pasarela de pagos disponible en Colombia
 */
import { Logger, LogCategory } from '../utils/logger';

export interface WompiConfig {
  publicKey: string; // Llave pública del API
  privateKey: string; // Llave privada del API
  merchantId: string; // Merchant ID (opcional, puede no ser necesario según la versión de la API)
  integritySecret: string; // Secreto de integridad (para verificar firma de transacciones)
  eventsSecret: string; // Secreto de eventos (para webhooks)
  environment: 'sandbox' | 'production';
}

let wompiConfig: WompiConfig | null = null;

/**
 * Obtiene la configuración de Wompi
 */
export function getWompiConfig(): WompiConfig {
  if (!wompiConfig) {
    const publicKey = process.env.WOMPI_PUBLIC_KEY;
    const privateKey = process.env.WOMPI_PRIVATE_KEY;
    const merchantId = process.env.WOMPI_MERCHANT_ID || '';
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET || '';
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET || '';
    const environment = (process.env.WOMPI_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

    if (!publicKey || !privateKey) {
      throw new Error(
        'Wompi no está configurado. Agrega WOMPI_PUBLIC_KEY y WOMPI_PRIVATE_KEY en tu archivo .env'
      );
    }

    if (!integritySecret && environment === 'production') {
      Logger.warn('WOMPI_INTEGRITY_SECRET no está configurado. Es recomendable configurarlo en producción.', {
        categoria: LogCategory.SISTEMA,
      });
    }

    if (!eventsSecret && environment === 'production') {
      Logger.warn('WOMPI_EVENTS_SECRET no está configurado. Es necesario para procesar webhooks en producción.', {
        categoria: LogCategory.SISTEMA,
      });
    }

    wompiConfig = {
      publicKey,
      privateKey,
      merchantId,
      integritySecret,
      eventsSecret,
      environment,
    };
  }

  return wompiConfig;
}

/**
 * URLs base de la API de Wompi
 */
export const WOMPI_API_URLS = {
  sandbox: 'https://sandbox.wompi.co/v1',
  production: 'https://production.wompi.co/v1',
};

/**
 * URL base según el entorno
 */
export function getWompiApiUrl(): string {
  const config = getWompiConfig();
  return WOMPI_API_URLS[config.environment];
}

/**
 * Precios de planes en COP (Pesos Colombianos)
 * Convertidos desde USD según el plan
 * 
 * Nota: Estos precios deben configurarse según la tasa de cambio actual
 * USD a COP aproximadamente: 1 USD = 4000 COP (ajustar según tasa actual)
 */
export const WOMPI_PLAN_PRICES = {
  pro: {
    monthly: 36000, // $9 USD * 4000 COP
    annual: 360000, // $90 USD * 4000 COP
  },
  premium: {
    monthly: 56000, // $14 USD * 4000 COP
    annual: 560000, // $140 USD * 4000 COP
  },
};

/**
 * Obtiene el precio de un plan en COP
 */
export function getWompiPlanPrice(planType: 'pro' | 'premium', isAnnual: boolean = false): number {
  const prices = WOMPI_PLAN_PRICES[planType];
  return isAnnual ? prices.annual : prices.monthly;
}

/**
 * Links de pago de Wompi (Payment Links)
 * Estos links redirigen a la página de pago de Wompi
 */
export const WOMPI_PAYMENT_LINKS = {
  pro: {
    monthly: process.env.WOMPI_PAYMENT_LINK_PRO_MONTHLY || '',
    annual: process.env.WOMPI_PAYMENT_LINK_PRO_ANNUAL || '',
  },
  premium: {
    monthly: process.env.WOMPI_PAYMENT_LINK_PREMIUM_MONTHLY || '',
    annual: process.env.WOMPI_PAYMENT_LINK_PREMIUM_ANNUAL || '',
  },
};

/**
 * Obtiene el link de pago de Wompi para un plan
 */
export function getWompiPaymentLink(planType: 'pro' | 'premium', isAnnual: boolean = false): string | null {
  const links = WOMPI_PAYMENT_LINKS[planType];
  const link = isAnnual ? links.annual : links.monthly;
  return link || null;
}

/**
 * Tipo de proveedor de pago
 */
export type PaymentProvider = 'stripe' | 'wompi';

