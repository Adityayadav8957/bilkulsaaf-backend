const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      select: false,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    anonymousIdentity: {
      label: { type: String, default: 'Citizen', immutable: true },
      number: { type: Number, required: true, unique: true, immutable: true },
      displayName: { type: String, required: true, immutable: true },
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    postsCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    savedPostsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/**
 * Public/anonymous-facing serialization. NEVER includes email, passwordHash,
 * or the real account _id. Safe to embed in any post/comment response.
 */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    anonymousDisplayName: this.anonymousIdentity.displayName,
    anonymousNumber: this.anonymousIdentity.number,
  };
};

/**
 * Private serialization for the authenticated user's own /me response only.
 */
userSchema.methods.toPrivateJSON = function toPrivateJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    anonymousIdentity: this.anonymousIdentity,
    role: this.role,
    status: this.status,
    postsCount: this.postsCount,
    commentsCount: this.commentsCount,
    savedPostsCount: this.savedPostsCount,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
