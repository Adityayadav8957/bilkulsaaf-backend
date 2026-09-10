const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    key: { type: String, required: true },
    type: { type: String, enum: ['image', 'video', 'document'], required: true },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
    personSnapshot: {
      name: { type: String, required: true },
      designation: { type: String, default: '' },
      organization: { type: String, default: '' },
      photoUrl: { type: String, default: '' },
      state: { type: String, required: true },
      city: { type: String, default: '' },
    },
    slug: { type: String, trim: true, unique: true, sparse: true },
    description: { type: String, required: true, maxlength: 5000 },
    media: { type: [mediaSchema], default: [] },
    upvoteCount: { type: Number, default: 0 },
    voteScore: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'removed', 'under_review'],
      default: 'active',
    },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ voteScore: -1 });
postSchema.index({ trendingScore: -1 });
postSchema.index({ commentCount: -1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ person: 1 });
postSchema.index({ 'personSnapshot.state': 1, 'personSnapshot.city': 1 });
postSchema.index({
  description: 'text',
  'personSnapshot.name': 'text',
  'personSnapshot.organization': 'text',
});

module.exports = mongoose.model('Post', postSchema);
