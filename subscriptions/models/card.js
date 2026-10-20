const mongoose = require('mongoose');
const crypto = require('crypto');

const secretKey = process.env.SECRET_KEY;

// Define the schema for card information
const cardSchema = new mongoose.Schema({
    cardHolderName: { type: String, required: true },
    last4: { type: String, required: true }, // Only the last 4 digits
    expiryMonth: { type: Number, required: true },
    expiryYear: { type: Number, required: true },
    cardToken: { type: String, required: true }, // Encrypted card token
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
});


// Encryption utility for sensitive fields
const encrypt = (text) => {
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

// Decryption utility
const decrypt = (encryptedText) => {
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const [ivHex, encryptedData] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedData, 'hex')), decipher.final()]);
    return decrypted.toString();
};

// Middleware to encrypt cardToken before saving
cardSchema.pre('save', function (next) {
    if (this.isModified('cardToken')) {
        this.cardToken = encrypt(this.cardToken);
    }
    next();
});

// Method to decrypt cardToken
cardSchema.methods.getDecryptedCardToken = function () {
    return decrypt(this.cardToken);
};

module.exports = mongoose.model('Card', cardSchema);
