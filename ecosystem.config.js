/**
 * Configuración de PM2 para el backend
 * 
 * Uso:
 *   pm2 start ecosystem.config.js          # Iniciar en modo producción
 *   pm2 start ecosystem.config.js --env development  # Iniciar en modo desarrollo
 *   pm2 stop menuqr-backend                # Detener
 *   pm2 restart menuqr-backend             # Reiniciar
 *   pm2 logs menuqr-backend                # Ver logs
 *   pm2 monit                              # Monitor
 *   pm2 delete menuqr-backend              # Eliminar proceso
 */

module.exports = {
  apps: [
    {
      name: 'menusqr-backend',
      script: 'dist/server.js',
      
      // Variables de entorno
      env: {
        NODE_ENV: 'development',
        PORT: 5290,
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 5290,
      },
      
      // Configuración de instancias (clúster mode)
      instances: 1, // Usar 1 para Socket.io (no compatible con múltiples instancias)
      exec_mode: 'fork', // 'fork' para Socket.io, 'cluster' para APIs sin WebSocket
      
      // Auto-reinicio
      autorestart: true,
      watch: false, // En producción siempre false
      max_memory_restart: '1G', // Reiniciar si usa más de 1GB de RAM
      
      // Manejo de errores
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true, // Agregar timestamp a los logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Configuración de reinicio
      min_uptime: '10s', // Tiempo mínimo que debe estar corriendo antes de considerarse "estable"
      max_restarts: 10, // Máximo número de reinicios en un período de tiempo
      restart_delay: 4000, // Delay entre reinicios (ms)
      
      // Señales de sistema
      kill_timeout: 5000, // Tiempo para cerrar gracefully antes de forzar kill
      listen_timeout: 10000, // Tiempo de espera para que la app esté lista
      shutdown_with_message: true,
      
      // Variables adicionales
      source_map_support: true,
      instance_var: 'INSTANCE_ID',
      
      // Scripts pre/post
      // pre_start: 'npm run build', // Compilar antes de iniciar (descomentar si es necesario)
      
      // Configuración de logs
      log_type: 'json', // Formato de logs (json o out)
      
      // Ignorar archivos en watch mode (solo si watch: true)
      ignore_watch: [
        'node_modules',
        'logs',
        '*.log',
        '.git',
        'dist',
      ],
    },
  ],

  // Configuración de deploy (opcional - para despliegues automatizados)
  deploy: {
    production: {
      user: 'deploy',
      host: ['apimenusqr.site'], // IP del servidor o hostname (ej: '192.168.1.100' o 'servidor.tuhosting.com')
      ref: 'origin/main',
      repo: 'https://github.com/AndresFelipe23/menuqr-api.git',
      path: '/var/www/menusqr-backend', // Ruta en el servidor
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};

