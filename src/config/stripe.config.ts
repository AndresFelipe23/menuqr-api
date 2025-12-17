import Stripe from 'stripe';

/**
 * Instancia de Stripe (inicialización lazy)
 * Solo se crea cuando se necesita usar
 */
let stripeInstance: Stripe | null = null;

/**
 * Obtiene la instancia de Stripe
 * Si no está configurada la API key, lanza un error descriptivo
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'STRIPE_SECRET_KEY no está configurada en las variables de entorno. ' +
        'Agrega STRIPE_SECRET_KEY a tu archivo .env. ' +
        'Para desarrollo, puedes usar: sk_test_... (obtener en https://dashboard.stripe.com/test/apikeys)'
      );
    }

    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });
  }

  return stripeInstance;
}

/**
 * Instancia de Stripe (lazy initialization)
 * Se inicializa solo cuando se accede por primera vez
 * Si no está configurada la API key, lanzará un error al intentar usarla
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const stripeInstance = getStripe();
    const value = (stripeInstance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(stripeInstance);
    }
    return value;
  },
});

/**
 * Planes de suscripción disponibles
 * FREE: Permanente, sin pago
 * PRO: Mensual o Anual (con descuento)
 * PREMIUM: Mensual o Anual (con descuento)
 */
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    prices: {
      USD: 0,
    },
    interval: 'month' as const,
    features: [
      'Hasta 15 items en el menú',
      'Hasta 5 mesas',
      '1 usuario (solo administrador)',
      'QR automático por mesa',
      'Soporte por email',
      'Sin marca de agua',
    ],
    limits: {
      maxItems: 15,
      maxMesas: 5,
      maxUsuarios: 1,
      maxCategorias: 3,
      websockets: false, // Sin tiempo real
      analytics: false,
      reservas: false,
      promociones: false,
    },
  },
  pro: {
    name: 'Pro',
    prices: {
      USD: 9, // Mensual
    },
    pricesAnnual: {
      USD: 90, // Anual (2 meses gratis: $9 * 10 = $90)
    },
    stripePriceIds: {
      USD: process.env.STRIPE_PRICE_ID_PRO || '',
    },
    stripePriceIdsAnnual: {
      USD: process.env.STRIPE_PRICE_ID_PRO_ANNUAL || '',
    },
    interval: 'month' as const,
    features: [
      'Items ilimitados en el menú',
      'Mesas ilimitadas',
      'Usuarios ilimitados',
      'WebSockets (tiempo real)',
      'Personalización completa',
      'Enlaces sociales',
      'Soporte prioritario',
      'Sin marca de agua',
    ],
    limits: {
      maxItems: -1, // Ilimitado
      maxMesas: -1,
      maxUsuarios: -1,
      maxCategorias: -1,
      websockets: true,
      analytics: false,
      reservas: false,
      promociones: false,
    },
  },
  premium: {
    name: 'Premium',
    prices: {
      USD: 14, // Mensual
    },
    pricesAnnual: {
      USD: 140, // Anual (2 meses gratis: $14 * 10 = $140)
    },
    stripePriceIds: {
      USD: process.env.STRIPE_PRICE_ID_PREMIUM || '',
    },
    stripePriceIdsAnnual: {
      USD: process.env.STRIPE_PRICE_ID_PREMIUM_ANNUAL || '',
    },
    interval: 'month' as const,
    features: [
      'Todo lo de Pro',
      'Sistema de reservas de mesas completo',
      'Gestión de horarios y políticas de reservas',
      'Calendario de reservas interactivo',
      'Confirmación automática de reservas',
      'Notificaciones push para clientes',
      'Historial completo de reservas',
      'Analytics y reportes avanzados (próximamente)',
      'Promociones y descuentos (próximamente)',
      'Reseñas y calificaciones (próximamente)',
      'Gestión de stock/inventario (próximamente)',
      'Integración con delivery (próximamente)',
      'Multi-idioma (próximamente)',
      'API personalizada (próximamente)',
      'Soporte 24/7',
      'White-label (opcional)',
    ],
    limits: {
      maxItems: -1,
      maxMesas: -1,
      maxUsuarios: -1,
      maxCategorias: -1,
      websockets: true,
      analytics: true,
      reservas: true,
      promociones: true,
    },
  },
};

/**
 * Obtiene el precio y price_id según el plan y período (mensual o anual)
 */
export function getPlanPrice(planType: PlanType, currency: string = 'USD', isAnnual: boolean = false) {
  const plan = SUBSCRIPTION_PLANS[planType];
  
  if (planType === 'free') {
    return {
      price: 0,
      priceId: null,
      currency: 'USD',
      interval: 'month' as const,
      isAnnual: false,
    };
  }

  // Para planes de pago, verificar que tenga stripePriceIds
  if (!('stripePriceIds' in plan)) {
    return {
      price: 0,
      priceId: null,
      currency: 'USD',
      interval: 'month' as const,
      isAnnual: false,
    };
  }

  // Determinar precio según período
  const price = isAnnual 
    ? (plan.pricesAnnual?.USD || plan.prices.USD * 10) // 10 meses = 2 meses gratis
    : plan.prices.USD;
  
  const priceId = isAnnual
    ? (plan.stripePriceIdsAnnual?.USD || '')
    : plan.stripePriceIds.USD;

  return {
    price,
    priceId,
    currency: 'USD',
    interval: isAnnual ? 'year' as const : 'month' as const,
    isAnnual,
  };
}

export type PlanType = keyof typeof SUBSCRIPTION_PLANS;

