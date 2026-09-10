const { S3Client } = require('@aws-sdk/client-s3');
const { config } = require('./env');

let client = null;

/**
 * Lazily creates (and caches) an S3 client from AWS_* env vars.
 * Lazy so that importing this module never throws even if AWS credentials
 * are not configured (e.g. during the require-only smoke test).
 * @returns {S3Client}
 */
function getS3Client() {
  if (!client) {
    client = new S3Client({
      region: config.aws.region,
      // AWS SDK v3.729+ computes a request checksum by default ("WHEN_SUPPORTED"),
      // which gets baked into presigned PutObject URLs (x-amz-checksum-crc32 /
      // x-amz-sdk-checksum-algorithm query params). The browser's plain PUT never
      // sends a matching checksum header, so the signature no longer matches and
      // S3 returns 403. "WHEN_REQUIRED" restores the pre-3.729 behavior.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      credentials:
        config.aws.accessKeyId && config.aws.secretAccessKey
          ? {
              accessKeyId: config.aws.accessKeyId,
              secretAccessKey: config.aws.secretAccessKey,
            }
          : undefined,
    });
  }
  return client;
}

module.exports = { getS3Client };
