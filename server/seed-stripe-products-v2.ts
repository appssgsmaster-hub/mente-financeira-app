import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.list({ limit: 100, active: true });
  
  let appProduct = existingProducts.data.find(p => p.name === 'Mente Financeira Premium');
  
  if (!appProduct) {
    appProduct = await stripe.products.create({
      name: 'Mente Financeira Premium',
      description: 'Acesso completo ao ecossistema financeiro SGS Group - Método das 6 Contas, projeções inteligentes, relatórios e muito mais.',
      metadata: { brand: 'SGS Group', type: 'subscription' },
    });
    console.log('Created app product:', appProduct.id);
  } else {
    console.log('App product exists:', appProduct.id);
  }

  const existingAppPrices = await stripe.prices.list({ product: appProduct.id, active: true });
  
  for (const price of existingAppPrices.data) {
    if (price.currency === 'brl') {
      await stripe.prices.update(price.id, { active: false });
      console.log('Deactivated old BRL price:', price.id);
    }
  }

  const hasEurMonthly = existingAppPrices.data.some(
    p => p.currency === 'eur' && p.recurring?.interval === 'month' && p.unit_amount === 4997
  );
  
  if (!hasEurMonthly) {
    const monthlyPrice = await stripe.prices.create({
      product: appProduct.id,
      unit_amount: 4997,
      currency: 'eur',
      recurring: { interval: 'month' },
      metadata: { plan: 'premium_monthly_eur' },
    });
    console.log('Created EUR monthly price:', monthlyPrice.id, '- €49,97/mês');
  } else {
    console.log('EUR monthly price already exists');
  }

  let mentoriaProduct = existingProducts.data.find(p => p.name === 'Mentoria Premium SGS');
  
  if (!mentoriaProduct) {
    mentoriaProduct = await stripe.products.create({
      name: 'Mentoria Premium SGS',
      description: 'Mentoria personalizada com sessão de PNL, guia completo do Método das 5 Contas, sessão online ao vivo e acesso vitalício ao app Mente Financeira.',
      metadata: { brand: 'SGS Group', type: 'one_time' },
    });
    console.log('Created mentoria product:', mentoriaProduct.id);
  } else {
    console.log('Mentoria product exists:', mentoriaProduct.id);
  }

  const existingMentoriaPrices = await stripe.prices.list({ product: mentoriaProduct.id, active: true });
  const hasMentoriaPrice = existingMentoriaPrices.data.some(
    p => p.currency === 'eur' && p.unit_amount === 19797
  );
  
  if (!hasMentoriaPrice) {
    const mentoriaPrice = await stripe.prices.create({
      product: mentoriaProduct.id,
      unit_amount: 19797,
      currency: 'eur',
      metadata: { plan: 'mentoria_premium_eur' },
    });
    console.log('Created mentoria price:', mentoriaPrice.id, '- €197,97');
  } else {
    console.log('Mentoria price already exists');
  }

  console.log('\n--- Summary ---');
  const allPrices1 = await stripe.prices.list({ product: appProduct.id, active: true });
  for (const p of allPrices1.data) {
    console.log(`App: ${p.id} - ${p.unit_amount! / 100} ${p.currency} ${p.recurring ? `/ ${p.recurring.interval}` : '(one-time)'}`);
  }
  const allPrices2 = await stripe.prices.list({ product: mentoriaProduct.id, active: true });
  for (const p of allPrices2.data) {
    console.log(`Mentoria: ${p.id} - ${p.unit_amount! / 100} ${p.currency} ${p.recurring ? `/ ${p.recurring.interval}` : '(one-time)'}`);
  }
}

createProducts().catch(console.error);
