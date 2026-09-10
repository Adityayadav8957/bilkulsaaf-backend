const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const reportService = require('../services/report.service');

const create = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason } = req.body;
  const report = await reportService.createReport(req.user.id, { targetType, targetId, reason });
  sendSuccess(res, report, 201);
});

module.exports = { create };
