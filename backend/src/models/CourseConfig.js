const mongoose = require('mongoose');

const techItemSchema = new mongoose.Schema(
  { name: { type: String, required: true, trim: true }, icon: { type: String, default: '📚' } },
  { _id: false }
);

const courseConfigSchema = new mongoose.Schema(
  {
    currentTechnology: { type: String, default: '' },
    startDate:         { type: Date,   default: null },
    totalClasses:      { type: Number, default: 0, min: 0 },
    completedClasses:  { type: Number, default: 0, min: 0 },
    techList:          { type: [techItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CourseConfig', courseConfigSchema);
