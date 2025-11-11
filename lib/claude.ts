import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY is not set - AI post generation will not work');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
});

export interface Product {
  product_name: string;
  category: string;
  current_price: number;
  original_price: number;
  discount_percent: number;
  product_details?: string;
}

export async function generatePost(
  product: Product,
  examplePosts: string[]
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const examplesText = examplePosts.length > 0
    ? examplePosts.join('\n\n---\n\n')
    : 'No examples provided - use your best judgment for Vietnamese deal-hunting posts.';

  const prompt = `You are a Facebook post generator for a Vietnamese deal-hunting business that sells American products from Costco/Sam's Club to Vietnamese customers.

AUDIENCE: Vietnamese people in Vietnam who want authentic American products
BUSINESS MODEL: Find deals at wholesale stores, post to Facebook Group, take orders, ship to Vietnam
TONE: Excited, friendly, uses emojis, mix of Vietnamese and English

STYLE GUIDELINES:
- Use emojis liberally but not excessively (🔥💊💰📉✅🚚 are common)
- Mix Vietnamese and English naturally
- Emphasize authenticity ("hàng chính hãng", "authentic")
- Show savings clearly (original price crossed out)
- Include shipping time (2-3 weeks to Vietnam)
- Call-to-action: Comment "ĐẶT" to order
- Add relevant hashtags (3-5)
- Convert price to VND (multiply USD by ~25,000)
- Keep posts concise but informative

EXAMPLE POSTS:
${examplesText}

GENERATE A POST FOR:
Product Name: ${product.product_name}
Category: ${product.category}
Current Price: $${product.current_price}
Original Price: $${product.original_price}
Discount: ${product.discount_percent}%
${product.product_details ? `Product Details: ${product.product_details}` : ''}

Generate a Facebook post in the style shown above. Return ONLY the post text, no additional commentary.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return message.content[0].type === 'text' ? message.content[0].text : '';
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}
