const { Settings } = require('../models');
const currencies = require('../config/currencies');

exports.get = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    res.json({ data: settings });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create(req.body);
    else await settings.update(req.body);
    res.json({ data: settings });
  } catch (err) { next(err); }
};

exports.currencies = async (req, res) => {
  res.json({ data: currencies });
};
