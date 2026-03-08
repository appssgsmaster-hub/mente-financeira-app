import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

const PRICE_TO_TIER: Record<string, string> = {
  'price_1T7u82Fmxmf4g4Sf6Gib2xs3': 'app',
  'price_1T7uAiFmxmf4g4Sf0I2xPZoM': 'method',
  'price_1T7uCTFmxmf4g4Sfkh9uIlYm': 'mentoria',
};

const TIER_HIERARCHY: Record<string, number> = { free: 0, app: 1, method: 2, mentoria: 3 };

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. '
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const event = JSON.parse(payload.toString()) as Stripe.Event;

    if (event.type === 'checkout.session.completed') {
      await WebhookHandlers.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
  }

  static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      if (session.payment_status !== 'paid') {
        console.log('Webhook: Checkout session not paid, skipping plan update');
        return;
      }

      const stripe = await getUncachableStripeClient();

      let userId: number | null = null;
      let planTier: string | null = null;

      if (session.payment_intent) {
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent.id;
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.metadata?.userId) {
          userId = parseInt(pi.metadata.userId, 10);
        }
        const VALID_TIERS = new Set(Object.values(PRICE_TO_TIER));
        if (pi.metadata?.planTier && VALID_TIERS.has(pi.metadata.planTier)) {
          planTier = pi.metadata.planTier;
        }
      }

      if (!userId && session.customer_email) {
        const user = await storage.getUserByEmail(session.customer_email);
        if (user) userId = user.id;
      }

      if (!userId && session.customer) {
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer.id;
        const customer = await stripe.customers.retrieve(customerId);
        if (!('deleted' in customer && customer.deleted) && customer.email) {
          const user = await storage.getUserByEmail(customer.email);
          if (user) userId = user.id;
        }
      }

      if (!userId) {
        console.error('Webhook: Could not identify user for checkout session', session.id);
        return;
      }

      if (!planTier) {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
        for (const item of lineItems.data) {
          const priceId = item.price?.id;
          if (priceId && PRICE_TO_TIER[priceId]) {
            const itemTier = PRICE_TO_TIER[priceId];
            if (!planTier || (TIER_HIERARCHY[itemTier] || 0) > (TIER_HIERARCHY[planTier] || 0)) {
              planTier = itemTier;
            }
          }
        }
      }

      if (!planTier) {
        console.error('Webhook: Could not determine plan tier for checkout session', session.id);
        return;
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.error('Webhook: User not found with id', userId);
        return;
      }

      const currentLevel = TIER_HIERARCHY[user.planTier || 'free'] || 0;
      const newLevel = TIER_HIERARCHY[planTier] || 0;

      if (newLevel > currentLevel) {
        await storage.updateUser(userId, {
          planTier: planTier,
          subscriptionStatus: 'active',
        });
        console.log(`Webhook: Updated user ${userId} plan from "${user.planTier}" to "${planTier}"`);
      } else if (user.subscriptionStatus !== 'active') {
        await storage.updateUser(userId, { subscriptionStatus: 'active' });
        console.log(`Webhook: Activated subscription for user ${userId} (plan already ${user.planTier})`);
      } else {
        console.log(`Webhook: User ${userId} already has plan "${user.planTier}" (>= "${planTier}"), no update needed`);
      }
    } catch (err) {
      console.error('Webhook: Error handling checkout.session.completed:', err);
    }
  }
}
