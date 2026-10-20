const mongoose = require('mongoose');

function get_cur_date() {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
  
    return new Date(year, month, day);
}  

const subscriptionSchema = new mongoose.Schema({ 
    subscribedAt: { type: Date, default: get_cur_date() },
    status: { type: String, enum: ['active', 'canceled'], default: 'active' },
    interval: { type: Number, enum: [1, 12], default: 1 },
    expiresAt: { type: Date },
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true }
});

// Middleware to calculate expiresAt
subscriptionSchema.pre('save', function (next) {
    if (!this.expiresAt) {
        const expires = new Date(this.subscribedAt || Date.now());
        expires.setUTCMonth(expires.getUTCMonth() + this.interval);
        this.expiresAt = expires;
    }
    next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema); 
