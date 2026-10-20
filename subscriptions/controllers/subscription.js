const Subscription = require('../models/subscription');

module.exports.getAll = async () => {
    return await Subscription.find().sort({ _id: 1 }).exec();
}

module.exports.getOne = async (subscription_id) => {
    return await Subscription.findOne({ _id: subscription_id }).exec();
}

module.exports.getUserSubscription = async (user_id) => {
    return await Subscription.findOne({ user_id: user_id , status: "active"}).exec();
}

module.exports.create = async (subscription) => {
    try {
        // Check if exists a subscription wich the status is active
        const activeSubscription = await Subscription.findOne({ user_id: subscription.user_id, status: 'active' });
        if (activeSubscription) {
            throw new Error('User already has an active subscription');
        }
        else {
            return await Subscription.create(subscription);
        }
    } catch (error) {
        throw error;
    }
}

module.exports.update = async (subscription_id, subscription) => {
    return Subscription.updateOne({ _id: subscription_id }, subscription);
}

module.exports.deleteOne = (subscription_id) => {
    return Subscription.deleteOne({ _id: subscription_id });
}

module.exports.getSubscriptionsByUserId = async (user_id) => {
    return await Subscription.find({ user_id: user_id }).exec();
}