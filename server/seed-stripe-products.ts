import { getUncachableStripeClient } from './stripeClient';

const PRODUCTS = [
  {
    name: 'Mente Financeira App',
    description: 'Acesso completo ao app financeiro — 6 contas, distribuição automatizada, dashboard, projeções e relatórios.',
    metadata: { brand: 'SGS Group', tier: 'app' },
    priceAmount: 4700,
    priceMeta: { tier: 'app' },
  },
  {
    name: 'Método Mente Financeira',
    description: 'Método financeiro completo — treinamento, guia das 5 contas, vídeo-aulas e implementação passo a passo. Inclui acesso ao app.',
    metadata: { brand: 'SGS Group', tier: 'method' },
    priceAmount: 19700,
    priceMeta: { tier: 'method' },
  },
  {
    name: 'Mentoria Transformação Financeira',
    description: 'Programa premium de transformação — 3 meses de mentoria, sessões ao vivo, estratégia personalizada, comunidade e acesso vitalício.',
    metadata: { brand: 'SGS Group', tier: 'mentoria' },
    priceAmount: 69700,
    priceMeta: { tier: 'mentoria' },
  },
];

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  for (const prod of PRODUCTS) {
    const existing = await stripe.products.search({ query: `name:'${prod.name}'` });
    if (existing.data.length > 0) {
      console.log(`Product already exists: ${prod.name} (${existing.data[0].id})`);
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      for (const price of prices.data) {
        console.log(`  Price: ${price.id} - ${price.unit_amount! / 100} ${price.currency}`);
      }
      continue;
    }

    const product = await stripe.products.create({
      name: prod.name,
      description: prod.description,
      metadata: prod.metadata,
    });
    console.log(`Created product: ${prod.name} (${product.id})`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: prod.priceAmount,
      currency: 'eur',
      metadata: prod.priceMeta,
    });
    console.log(`  Price: ${price.id} - €${prod.priceAmount / 100}`);
  }
}

createProducts().catch(console.error);
