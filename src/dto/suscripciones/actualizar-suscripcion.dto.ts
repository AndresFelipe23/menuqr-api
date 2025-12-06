import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { PlanType } from '../../config/stripe.config';

export class ActualizarSuscripcionDto {
  @IsEnum(['trial', 'basic', 'premium', 'enterprise'], {
    message: 'El tipo de plan debe ser: trial, basic, premium o enterprise',
  })
  @IsOptional()
  tipoPlan?: PlanType;

  @IsBoolean({ message: 'cancelarAlFinPeriodo debe ser un booleano' })
  @IsOptional()
  cancelarAlFinPeriodo?: boolean;
}

