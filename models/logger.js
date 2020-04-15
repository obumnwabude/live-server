const mongoose = require('mongoose');

module.exports = mongoose.model('Logger', new mongoose.Schema({
  date: { type: Date, default: new Date() },
  log: String
}));
