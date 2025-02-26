const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const authMiddleware = (req, res, next) => {
  // Extraer el token del encabezado Authorization
  const token = req.header('Authorization')?.split(' ')[1];

  // Verificar si el token existe
  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó un token.' });
  }

  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Adjuntar los datos del usuario a la solicitud
    req.user = decoded;

    // Continuar con el siguiente middleware o ruta
    next();
  } catch (error) {
    // Si el token no es válido
    res.status(401).json({ message: 'Token inválido.' });
  }
};

module.exports = authMiddleware;
