import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Capturar el cuerpo de la respuesta
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    
    // Log de la petición
    console.log({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      ...(req.body && Object.keys(req.body).length > 0 && { body: req.body })
    });
    
    return originalSend.call(this, body);
  };
  
  next();
};

