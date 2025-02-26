const mongoose = require('mongoose');

// Esquema del curso
const cursoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
    unique: true  // Add this line to ensure uniqueness
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  duracion: {
    type: Number,
    required: true
  },
  categoria: {
    type: String,
    enum: ['Gestión', 'Liderazgo', 'Tecnología', 'Otros'],
    default: 'Otros'
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Crear el modelo
const Curso = mongoose.model('Curso', cursoSchema);

module.exports = Curso;
