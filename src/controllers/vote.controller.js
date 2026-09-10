const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const voteService = require('../services/vote.service');

const voteOnPost = asyncHandler(async (req, res) => {
  const { value } = req.body;
  const result = await voteService.castVote(req.params.id, req.user.id, value);
  sendSuccess(res, result);
});

module.exports = { voteOnPost };
