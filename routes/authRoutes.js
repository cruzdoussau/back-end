const authMiddleware = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Curso = require('../models/Curso');
const Inscripcion = require('../models/Inscripcion');
const { PDFDocument, rgb } = require('pdf-lib'); // Importar pdf-lib
const fs = require('fs'); // Para manejar archivos



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

// Ruta para inscribir un usuario en un curso
router.post('/inscribir', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.body;

    // Verificar si el usuario ya está inscrito en el curso
    const inscripcionExistente = await Inscripcion.findOne({
      usuario: req.user.id,
      curso: cursoId
    });

    if (inscripcionExistente) {
      return res.status(400).json({ message: 'Ya estás inscrito en este curso.' });
    }

    // Crear una nueva inscripción
    const nuevaInscripcion = new Inscripcion({
      usuario: req.user.id,
      curso: cursoId
    });

    await nuevaInscripcion.save();
    res.status(201).json({ message: 'Inscripción exitosa.', inscripcion: nuevaInscripcion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al inscribirse en el curso.' });
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


// Ruta para listar los cursos en los que el usuario está inscrito
router.get('/mis-cursos', authMiddleware, async (req, res) => {
  try {
    const inscripciones = await Inscripcion.find({ usuario: req.user.id })
      .populate('curso', 'nombre descripcion duracion categoria');

    res.json(inscripciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los cursos inscritos.' });
  }
});

// Ruta para actualizar el progreso de un usuario en un curso
router.put('/actualizar-progreso', authMiddleware, async (req, res) => {
  try {
    const { cursoId, progreso } = req.body;

    // Validar el progreso
    if (progreso < 0 || progreso > 100) {
      return res.status(400).json({ message: 'El progreso debe estar entre 0 y 100.' });
    }

    // Buscar la inscripción del usuario en el curso
    const inscripcion = await Inscripcion.findOne({
      usuario: req.user.id,
      curso: cursoId
    });

    if (!inscripcion) {
      return res.status(404).json({ message: 'No estás inscrito en este curso.' });
    }

    // Actualizar el progreso
    inscripcion.progreso = progreso;
    inscripcion.completado = progreso === 100; // Marcar como completado si el progreso es 100%
    await inscripcion.save();

    res.json({ message: 'Progreso actualizado exitosamente.', inscripcion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar el progreso.' });
  }
});

// Ruta para generar un certificado
router.get('/certificado/:cursoId', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;

    // Buscar la inscripción del usuario en el curso
    const inscripcion = await Inscripcion.findOne({
      usuario: req.user.id,
      curso: cursoId
    }).populate('curso', 'nombre');

    if (!inscripcion) {
      return res.status(404).json({ message: 'No estás inscrito en este curso.' });
    }

    if (!inscripcion.completado) {
      return res.status(400).json({ message: 'El curso no ha sido completado.' });
    }

    // Crear el certificado
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]); // Tamaño personalizado (ancho x alto)

    // Agregar contenido al certificado
    const { width, height } = page.getSize();
    page.drawText('Certificado de Completación', {
      x: 50,
      y: height - 50,
      size: 24,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Este certifica que`, {
      x: 50,
      y: height - 100,
      size: 18,
      color: rgb(0, 0, 0),
    });

    page.drawText(`${req.user.nombre}`, {
      x: 50,
      y: height - 130,
      size: 20,
      color: rgb(0, 0, 0),
    });

    page.drawText(`ha completado el curso:`, {
      x: 50,
      y: height - 170,
      size: 18,
      color: rgb(0, 0, 0),
    });

    page.drawText(`${inscripcion.curso.nombre}`, {
      x: 50,
      y: height - 200,
      size: 20,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Fecha: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: height - 250,
      size: 16,
      color: rgb(0, 0, 0),
    });

    // Serializar el PDF a bytes
    const pdfBytes = await pdfDoc.save();

    // Enviar el PDF como respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificado-${inscripcion.curso.nombre}.pdf`);
    res.send(pdfBytes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar el certificado.' });
  }
});

// Ruta para el dashboard del usuario
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const { estado } = req.query; // Obtener el filtro de estado (opcional)

    // Construir el filtro dinámico
    const filtro = { usuario: req.user.id };
    if (estado === 'completado') {
      filtro.completado = true;
    } else if (estado === 'en-progreso') {
      filtro.completado = false;
    }

    // Buscar todas las inscripciones del usuario
    const inscripciones = await Inscripcion.find(filtro)
      .populate('curso', 'nombre');

    // Calcular estadísticas generales
    const totalCursos = inscripciones.length;
    const cursosCompletados = inscripciones.filter(ins => ins.completado).length;
    const progresoPromedio = totalCursos > 0
      ? inscripciones.reduce((suma, ins) => suma + ins.progreso, 0) / totalCursos
      : 0;

    // Formatear los datos para el frontend
    const dashboardData = {
      resumen: {
        totalCursos,
        cursosCompletados,
        progresoPromedio: parseFloat(progresoPromedio.toFixed(2)), // Redondear a 2 decimales
      },
      cursosInscritos: inscripciones.map(ins => ({
        curso: ins.curso.nombre,
        progreso: ins.progreso,
        completado: ins.completado,
      })),
    };

    res.json(dashboardData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al cargar el dashboard.' });
  }
});

module.exports = router;
