var express = require('express');
var router = express.Router();

const Subscriptions = require('../controllers/subscription');
const Cards = require('../controllers/card');
const validator = require('validator');

/////////////////////
// HELPER FUNCTIONS
/////////////////////

function validateCreditCard(cardNumber, expireMonth, expireYear, cvc) {
	const expiryDate = `${expireMonth}/${expireYear}`;
	console.log(expiryDate);
    // Validate card number
    const clean = String(cardNumber).replace(/\D/g, "");
        if (!/^\d{16}$/.test(clean)) {
            return { success: false, message: "Invalid card number. It must be exactly 16 digits." };
        }


    // Validate expiry date (basic MM/YY check)
    const expiryRegex = /^(0[1-9]|1[0-2])\/(\d{2})$/;
    if (!expiryRegex.test(expiryDate)) {
        return {
            success: false,
            message: 'Invalid expiry date format. Use MM/YY.'
        };
    }

    // Check if the expiry date is in the future
    const [month, year] = expiryDate.split('/').map(Number);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Get last two digits of year
    const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return {
            success: false,
            message: 'The card has expired.'
        };
    }

    // Validate CVC (3 or 4 digits)
    const cvcRegex = /^\d{3,4}$/;
    if (!cvcRegex.test(cvc)) {
        return {
            success: false,
            message: 'Invalid CVC code. Must be 3 or 4 digits.'
        };
    }

    // If all validations pass
    return {
        success: true,
        message: 'Credit card is valid.'
    };
}

function get_cur_date() {
	const date = new Date();
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth();
	const day = date.getUTCDate();

	return { year: year, month: month, day: day };
}

function calculateExpirationDate(subscribedAt, interval) {
	const expiresAt = new Date(subscribedAt);
	expiresAt.setUTCMonth(expiresAt.getUTCMonth() + interval);
	return expiresAt;
}

////////
// GET
////////

// Get all subscription
router.get('/', function (req, res, next) {
  Subscriptions.getAll()
	  .then(subscription => res.status(201).jsonp(subscription))
	  .catch(err => res.status(700).jsonp(err));
});

router.get('/cards', function(req, res, next) {
	Cards.getAll()
	  .then(cards => res.status(201).jsonp(cards))
	  .catch(err => res.status(702).jsonp(err));
});

// Get specific subscription
router.get('/:user', function (req, res, next) {
    Subscriptions.getUserSubscription(req.params.user)
	  .then(subscription => res.status(201).jsonp(subscription))
	  .catch(err => res.status(701).jsonp(err));
});

// Check subscription status
router.get('/:user/status', function(req, res, next) {
	Subscriptions.getUserSubscription(req.params.user)
		.then(subscription => {
			if (!subscription) {
			  Subscriptions.getSubscriptionsByUserId(req.params.user)
				.then(subscriptions => {
				  if (subscriptions.length === 0) {
					return res.status(404).jsonp({ error: 'Subscription not found' });
				  }
				  return res.status(201).jsonp({ status: 'canceled' });
				})
				.catch(err => res.status(701).jsonp(err));
			}
            else {
                // Check if subscription has canceled
                const currentDate = get_cur_date();

                if (currentDate > subscription.expiresAt && subscription.status !== 'canceled') {
                    subscription.status = 'canceled';
                    return Subscriptions.update(req.params.subscription, subscription)
                        .then(updated => res.status(201).jsonp({ status: updated.status }));
                }
			    res.status(201).jsonp({ status: subscription.status });
            }
	  	})
	.catch(err => res.status(701).jsonp(err));
});

router.get('/:user/card', function(req, res, next) {
	Cards.getCardByUserId(req.params.user)
	  .then(card => res.status(201).jsonp(card))
	  .catch(err => res.status(704).jsonp(err));
});

//////////
// POST 
//////////

/**
 * Subscribe to a plan
 * @param {Object} req.body.subscription - The subscription details
 * @param {Object} req.body.card - The card details
 * @returns {Object} - The created subscription
**/

// Subscribe to a plan 
router.post("/", async (req, res) => {
  try {
    const validation = validateCreditCard(
      req.body.card.cardNumber,
      req.body.card.expiryMonth,
      req.body.card.expiryYear,
      req.body.card.cvc
    );

    if (!validation.success) {
      return res.status(400).jsonp({ error: validation.message });
    }

    const subscription = await Subscriptions.create(req.body.subscription);
    await Cards.create(req.body.card, subscription._id);

    return res.status(201).jsonp(subscription);
  } catch (err) {
    console.error("Error processing subscription:", err);
    return res.status(500).jsonp({ error: "Internal server error" });
  }
});



/////////
// PUT
/////////

// Update Subscription 
router.put('/:user', function(req,res,next){
	Subscriptions.getUserSubscription(req.params.user)
		.then(subscription =>{
			if (!subscription) {
                return res.status(404).jsonp({ error: 'Subscription not found' });
            }

			if (req.body.status && ['active', 'canceled'].includes(req.body.status)) {
                subscription.status = req.body.status;
            }

			if (req.body.interval && [1, 12].includes(req.body.interval)) {
				subscription.interval = req.body.interval;
				subscription.expiresAt = calculateExpirationDate(subscription.subscribedAt, req.body.interval);
			}
			return Subscriptions.update(subscription._id, subscription);
    	})
		.then(subscription => res.status(201).jsonp(subscription))
		.catch(err => res.status(500).jsonp(err));
});

router.put('/:user/cancel', async function (req, res, next) {
    try {
      // Get the user's subscription
      const subscription = await Subscriptions.getUserSubscription(req.params.user);
  
      // Check if the subscription exists
      if (!subscription) {
        return res.status(404).jsonp({ error: 'Subscription not found' });
      }
  
      // Check if the subscription is already canceled
      if (subscription.status === 'canceled') {
        return res.status(400).jsonp({ error: 'Subscription is already canceled' });
      }
  
      // Update the subscription's status to 'canceled'
      subscription.status = 'canceled';
      await Subscriptions.update(subscription._id, subscription);
      
      // Respond with the updated subscription
      return res.status(200).jsonp(subscription);
    } catch (err) {
      // Handle unexpected errors
      return res.status(500).jsonp({ error: 'An unexpected error occurred', details: err.message });
    }
});

router.put('/:user/card', function(req, res, next) {
    Cards.getCardByUserId(req.params.user)
        .then(card => {
            if (!card) {
                return res.status(404).jsonp({ error: 'Card not found' });
            }
            const validation = validateCreditCard(
                req.body.cardNumber,
                req.body.expiryMonth,
                req.body.expiryYear,
                req.body.cvc
            );

            if (!validation.success) {
                return res.status(400).jsonp({ error: validation.message });
            }

            return Cards.update(card._id, req.body);
        }
    )
    .then(card => res.status(200).jsonp(card))
    .catch(err => res.status(705).jsonp(err));
});
////////////
// DELETE
////////////

// Delete subscription
router.delete('/:subscription', function(req, res, next) {
	Subscriptions.delete(req.params.subscription)
				 .then(subscription => res.status(200).jsonp(subscription))
				 .catch(err => res.status(706).jsonp(err));
}); 

module.exports = router;