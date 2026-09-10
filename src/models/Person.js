const mongoose = require('mongoose');

const personSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, trim: true, default: '' },
    organization: { type: String, trim: true, default: '' },
    location: {
      state: { type: String, required: true, trim: true },
      city: { type: String, trim: true, default: '' },
    },
    slugKey: { type: String, required: true, unique: true },
    slug: { type: String, trim: true, unique: true, sparse: true },
    stats: {
      postsCount: { type: Number, default: 0 },
      totalVotes: { type: Number, default: 0 },
      totalComments: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

personSchema.index({ name: 'text', organization: 'text', designation: 'text' });
personSchema.index({ 'location.state': 1, 'location.city': 1 });
personSchema.index({ 'stats.totalVotes': -1 });

module.exports = mongoose.model('Person', personSchema);
