const Card = require('../models/card');
const Subscriptions = require('../controllers/subscription');

module.exports.getAll = async () => {
    try {
        return await Card.find();
    }
    catch (error) {
        console.error('Error retrieving cards:', error);
    }
}

module.exports.create = async (cardData, subscriptionId) => {
    const newCard = {
        cardHolderName: cardData.cardHolderName,
        last4: cardData.cardNumber.slice(-4), // Store only the last 4 digits
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        cardToken: cardData.cardNumber, // The full card number to be hashed
        subscriptionId: subscriptionId
    };

    try {
        return await Card.create(newCard);
    } catch (error) {
        console.error('Error saving card:', error);
    }
}

module.exports.removeCard = async (idCard) => {
    try {
        const deletedCard = await Card.findByIdAndDelete(idCard);
        console.log('Card deleted successfully:', deletedCard);
    } catch (error) {
        console.error('Error deleting card:', error);
    }
}

module.exports.removeBySubscriptionId = async (subscriptionId) => {
    try {
        const deletedCards = await Card.deleteMany({ subscriptionId: subscriptionId });
        console.log('Cards deleted successfully:', deletedCards);
    } catch (error) {
        console.error('Error deleting cards:', error);
    }
}

module.exports.getCardBySubscriptionId = async (subscriptionId) => {
    try {
        const card = await Card.findOne({ subscriptionId: subscriptionId });
        if (!card) {
            console.warn(`No card found for subscription ID: ${subscriptionId}`);
            return null;
        }
        return card;
    } catch (error) {
        console.error('Error retrieving card:', error);
        throw error;
    }
}

module.exports.getCardByUserId = async (userId) => {
    try {
        const subscription = await Subscriptions.getUserSubscription(userId);
        if (!subscription) {
            console.warn(`No subscription found for user ID: ${userId}`);
            throw new Error('Subscription not found');
        }
        const card = await Card.findOne({ subscriptionId: subscription._id });
        if (!card) {
            console.warn(`No card found for subscription ID: ${subscription._id}`);
            throw new Error('Card not found');
        }
        return card;
    }
    catch (error) {
        console.error('Error retrieving card:', error);
        throw error;
    }
}

module.exports.update = async (idCard, cardData) => {
  try {
    // Fetch the card document
    const card = await Card.findById(idCard);

    // If the card does not exist, throw an error
    if (!card) {
      throw new Error('Card not found');
    }

    card.cardHolderName = cardData.cardHolderName;
    card.last4 = cardData.cardNumber.slice(-4); // Store only the last 4 digits
    card.expiryMonth = cardData.expiryMonth;
    card.expiryYear = cardData.expiryYear;
    card.cardToken = cardData.cardNumber; // The full card number to be hashed

    // Save the document to trigger middleware (including pre-save)
    const updatedCard = await card.save();

    // Return the updated card
    return updatedCard;
  } catch (error) {
    console.error('Error updating card:', error);
    throw error; // Re-throw the error after logging it
  }
};

