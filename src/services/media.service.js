const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getS3Client } = require('../config/s3');
const { config } = require('../config/env');
const ApiError = require('../utils/ApiError');

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
// Generous cap; actual enforcement of the byte limit happens via S3 bucket
// policy / presigned POST conditions in a production deployment. This value
// is only recorded/echoed back for the client's own pre-flight checks.
const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const UPLOAD_URL_EXPIRY_SECONDS = 5 * 60; // 5 minutes

const EXTENSION_BY_CONTENT_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
};

/**
 * Generates a presigned S3 PUT URL for direct client -> S3 upload, plus the
 * object key and the resulting public URL the client should store on the
 * post's media array after a successful upload.
 */
async function generateUploadUrl(userId, fileName, contentType) {
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw ApiError.badRequest(
      `Unsupported content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      'UNSUPPORTED_CONTENT_TYPE'
    );
  }
  if (!config.aws.bucket) {
    throw ApiError.internal('Media upload is not configured', 'S3_NOT_CONFIGURED');
  }

  const ext = EXTENSION_BY_CONTENT_TYPE[contentType];
  const key = `uploads/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: config.aws.bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });

  const publicUrl = config.aws.publicBaseUrl
    ? `${config.aws.publicBaseUrl.replace(/\/$/, '')}/${key}`
    : `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

  return {
    uploadUrl,
    key,
    publicUrl,
    contentType,
    maxSizeBytes: MAX_UPLOAD_SIZE_BYTES,
    expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
  };
}

module.exports = { generateUploadUrl, ALLOWED_CONTENT_TYPES, MAX_UPLOAD_SIZE_BYTES };
