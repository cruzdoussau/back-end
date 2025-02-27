const mongoose = require('mongoose');

// Esquema de inscripción
const inscripcionSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  curso: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Curso',
    required: true
  },
  progreso: {
    type: Number,
    default: 0 // Porcentaje de progreso (0% al inicio)
  },
  completado: {
    type: Boolean,
    default: false // Indica si el usuario ha completado el curso
  }
}, { timestamps: true });

// Crear el modelo
const Inscripcion = mongoose.model('Inscripcion', inscripcionSchema);

module.exports = Inscripcion;
