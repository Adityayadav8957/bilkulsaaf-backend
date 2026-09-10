const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const mapService = require('../services/map.service');

const states = asyncHandler(async (req, res) => {
  const data = await mapService.aggregateByState();
  sendSuccess(res, data);
});

const stateDetail = asyncHandler(async (req, res) => {
  const { state } = req.params;
  if (!state) throw ApiError.badRequest('state is required', 'STATE_REQUIRED');
  const data = await mapService.aggregateByStateDetail(state);
  sendSuccess(res, { state, cities: data });
});

const cityDetail = asyncHandler(async (req, res) => {
  const { city } = req.params;
  if (!city) throw ApiError.badRequest('city is required', 'CITY_REQUIRED');
  const data = await mapService.aggregateByCity(city);
  sendSuccess(res, { city, ...data });
});

const citiesIndex = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const { items, nextCursor } = await mapService.aggregateCitiesIndex({ cursor, limit });
  sendSuccess(res, { items, nextCursor });
});

module.exports = { states, stateDetail, cityDetail, citiesIndex };
