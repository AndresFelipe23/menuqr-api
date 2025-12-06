import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { PlanType } from '../../config/stripe.config';
import { PaymentProvider } from '../../config/wompi.config';

export class CrearSuscripcionDto {
  @IsString({ message: 'El restauranteId debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El restauranteId es requerido' })
  restauranteId: string;

  @IsEnum(['free', 'pro', 'premium'], {
    message: 'El tipo de plan debe ser: free, pro o premium',
  })
  @IsNotEmpty({ message: 'El tipo de plan es requerido' })
  tipoPlan: PlanType;

  @IsBoolean({ message: 'isAnnual debe ser un booleano' })
  @IsOptional()
  isAnnual?: boolean; // Si es true, se cobra el plan anual (con descuento)

  @IsEnum(['stripe', 'wompi'], {
    message: 'El proveedor de pago debe ser: stripe o wompi',
  })
  @IsOptional()
  paymentProvider?: PaymentProvider; // Proveedor de pago: stripe o wompi (default: stripe)

  @IsString({ message: 'El paymentMethodId debe ser una cadena de texto' })
  @IsOptional()
  paymentMethodId?: string; // Para planes de pago (no free) - token/payment method del proveedor
}

