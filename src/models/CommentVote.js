const mongoose = require('mongoose');

const commentVoteSchema = new mongoose.Schema(
  {
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    value: { type: Number, enum: [1], required: true },
  },
  { timestamps: true }
);

commentVoteSchema.index({ comment: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('CommentVote', commentVoteSchema);
