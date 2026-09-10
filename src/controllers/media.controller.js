const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const mediaService = require('../services/media.service');

const uploadUrl = asyncHandler(async (req, res) => {
  const { fileName, contentType } = req.body;
  const result = await mediaService.generateUploadUrl(req.user.id, fileName, contentType);
  sendSuccess(res, result, 201);
});

module.exports = { uploadUrl };
