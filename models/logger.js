const mongoose = require('mongoose');

module.exports = mongoose.model('Logger', new mongoose.Schema({logs: String}));
