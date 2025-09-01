const pricingModel = require('../models/flashingPricing');

module.exports = {
  getPricing: (req, res) => {
    const row = pricingModel.get();
    res.json({ success: true, pricing: row });
  },

  updatePricing: (req, res) => {
    const { per_bend, per_width_mm, per_length_mm, base_fee } = req.body;
    pricingModel.update({
      per_bend: Number(per_bend) || 0,
      per_width_mm: Number(per_width_mm) || 0,
      per_length_mm: Number(per_length_mm) || 0,
      base_fee: Number(base_fee) || 0
    });
    const row = pricingModel.get();
    res.json({ success: true, pricing: row });
  }
};
