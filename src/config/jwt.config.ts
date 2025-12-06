/**
 * Configuración de JWT
 */
export const jwtConfig = {
  secret: process.env.JWT_SECRET!,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

/**
 * Valida que las variables de JWT estén configuradas
 */
export function validateJwtConfig(): { valid: boolean; missing: string[] } {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing: string[] = [];

  required.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

