const authMiddleware = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Curso = require('../models/Curso');

// Cargar variables de entorno
dotenv.config();

// Ruta para registrar un nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
   // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // Crear un nuevo usuario
    const newUser = new User({ nombre, email, password });
    await newUser.save();

    res.status(201).json({ message: 'Usuario registrado exitosamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar el usuario.' });
  }
});

// Ruta para iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar al usuario por correo electrónico
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas.' });
    }

    // Comparar contraseñas
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas.' });
    }

    // Generar token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ token, user: { id: user._id, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al iniciar sesión.' });
  }
  
});

router.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Ruta protegida accedida correctamente', user: req.user });
});

// Ruta para listar todos los cursos
router.get('/cursos', async (req,res)=> {
try{
  const cursos = await Curso.find().populate('creadoPor', 'nombre email'); // Fixed: Changed 'CreadoPor' to 'creadoPor'
  res.json(cursos);
} catch (error){
  console.error(error);
  res.status(500).json({ message: 'Error al obtener los cursos.'});
}
});

// Ruta para crear un nuevo curso
router.post('/cursos', authMiddleware, async (req, res) => {
  try {
    const { nombre, descripcion, duracion, categoria } = req.body;

    // Crear un nuevo curso
    const nuevoCurso = new Curso({
      nombre,
      descripcion,
      duracion,
      categoria,
      creadoPor: req.user.id // ID del usuario autenticado
    });

    await nuevoCurso.save();
    res.status(201).json({ message: 'Curso creado exitosamente.', curso: nuevoCurso });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear el curso.' });
  }
});

// Ruta para eliminar un curso por su ID
router.delete('/cursos/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar y eliminar el curso
    const cursoEliminado = await Curso.findByIdAndDelete(id);

    if (!cursoEliminado) {
      return res.status(404).json({ message: 'Curso no encontrado.' });
    }

    res.json({ message: 'Curso eliminado exitosamente.', curso: cursoEliminado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar el curso.' });
  }
});

// Ruta para editar un curso por su ID
router.put('/cursos/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, duracion, categoria } = req.body;

    // Buscar y actualizar el curso
    const cursoActualizado = await Curso.findByIdAndUpdate(
      id,
      { nombre, descripcion, duracion, categoria },
      { new: true } // Devuelve el documento actualizado
    );

    if (!cursoActualizado) {
      return res.status(404).json({ message: 'Curso no encontrado.' });
    }

    res.json({ message: 'Curso actualizado exitosamente.', curso: cursoActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar el curso.' });
  }
});

module.exports = router;
