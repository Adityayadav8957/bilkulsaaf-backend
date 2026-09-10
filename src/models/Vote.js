const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    value: { type: Number, enum: [1], required: true },
  },
  { timestamps: true }
);

voteSchema.index({ post: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
