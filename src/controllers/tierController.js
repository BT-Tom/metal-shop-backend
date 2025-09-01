const Tier = require('../models/tier');

exports.getAll = (req, res) => {
    res.json(Tier.getAll());
};

exports.update = (req, res) => {
    Tier.update(req.params.level, req.body.percent_markup);
    res.json({ success: true });
};

exports.create = (req, res) => {
    console.log('Session after item create:', req.session); // Add this line
};