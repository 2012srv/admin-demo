const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
    token: { type: String, required: true },
    expire_at: { type: Date, default: Date.now, expires: '1d' }
}, { timestamps: true })

module.exports = mongoose.model('Token', TokenSchema);