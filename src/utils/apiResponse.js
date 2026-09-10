/**
 * Sends a consistent success envelope: { success: true, data: ... }
 * @param {import('express').Response} res
 * @param {any} data
 * @param {number} [statusCode=200]
 */
function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

module.exports = { sendSuccess };
