const Cart = require('../models/cart');
const Order = require('../models/order');
let stripe = null;
function getStripe() {
    if (stripe) return stripe;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set in environment');
    stripe = require('stripe')(key);
    return stripe;
}

exports.createCheckoutSession = async (req, res) => {
    try {
        const user_id = req.session.userId;
        if (!user_id) return res.status(401).json({ error: 'Login required to checkout' });

        const items = Cart.getByUser(user_id);
        if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

        const currency = process.env.STRIPE_CURRENCY || 'usd';

        const line_items = items.map(i => {
            const unit_price = Math.round((i.price || 0) * 100); // cents
            return {
                price_data: {
                    currency,
                    product_data: { name: i.name },
                    unit_amount: unit_price
                },
                quantity: i.quantity
            };
        });

        const total = items.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 1)), 0);
        const total_cents = Math.round(total * 100);

        // create Stripe Checkout session
    const stripeClient = getStripe();
    const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: process.env.STRIPE_SUCCESS_URL || `http://localhost:3000/cart.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: process.env.STRIPE_CANCEL_URL || `http://localhost:3000/cart.html?canceled=true`,
            metadata: { user_id: String(user_id) }
        });

        // persist order with session id and items
        const orderId = Order.createOrder(user_id, session.id, total_cents, currency);
        items.forEach(it => {
            const unit_price_cents = Math.round((it.price || 0) * 100);
            Order.addOrderItem(orderId, it.item_id, it.quantity, unit_price_cents, it.custom_data || null);
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Create checkout error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    }
};

exports.webhook = (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    let event;
    try {
        if (webhookSecret) {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            // If no webhook secret provided (local test), parse body directly
            event = req.body;
        }
    } catch (e) {
        console.error('Webhook signature verification failed:', e.message);
        return res.status(400).send(`Webhook Error: ${e.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data ? event.data.object : event;
        const sessionId = session.id;
        const userMeta = session.metadata && session.metadata.user_id ? Number(session.metadata.user_id) : null;

        // mark order paid and clear user's cart
        const changed = Order.markPaidBySessionId(sessionId);
        if (changed) {
            if (userMeta) {
                // Clear cart for user
                try {
                    const CartModel = require('../models/cart');
                    CartModel.clearCart(userMeta);
                } catch (e) {
                    console.error('Failed to clear cart after payment:', e);
                }
            }
        }
    }

    res.json({ received: true });
};
