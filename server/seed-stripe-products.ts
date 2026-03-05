import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  const products = await stripe.products.search({ query: "name:'Mente Financeira Premium'" });
  if (products.data.length > 0) {
    console.log('Product already exists:', products.data[0].id);
    const prices = await stripe.prices.list({ product: products.data[0].id, active: true });
    for (const price of prices.data) {
      console.log(`  Price: ${price.id} - ${price.unit_amount! / 100} ${price.currency} / ${price.recurring?.interval}`);
    }
    return;
  }

  const product = await stripe.products.create({
    name: 'Mente Financeira Premium',
    description: 'Acesso completo ao ecossistema financeiro SGS Group - Método das 6 Contas, projeções inteligentes, relatórios e muito mais.',
    metadata: {
      brand: 'SGS Group',
      type: 'subscription',
    },
  });
  console.log('Created product:', product.id);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 4900,
    currency: 'brl',
    recurring: { interval: 'month' },
    metadata: { plan: 'premium_monthly' },
  });
  console.log('Created monthly price:', monthlyPrice.id, '- R$ 49,00/mês');

  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 47000,
    currency: 'brl',
    recurring: { interval: 'year' },
    metadata: { plan: 'premium_yearly' },
  });
  console.log('Created yearly price:', yearlyPrice.id, '- R$ 470,00/ano');
}

createProducts().catch(console.error);
