const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
    phone: { type: String },
    email: { type: String },
    otp: { type: String, required: true },
    expire_at: { type: Date, default: Date.now, expires: 3000 }
}, { timestamps: true })

module.exports = mongoose.model('Otp', OtpSchema);