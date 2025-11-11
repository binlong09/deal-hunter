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
  sku?: string;
  brand?: string;
  size?: string;
  quantity?: string;
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
    ? examplePosts.join('\n\n---EXAMPLE SEPARATOR---\n\n')
    : 'No examples provided - use your best judgment for Vietnamese deal-hunting posts.';

  const prompt = `You are a Facebook post generator for a Vietnamese deal-hunting business that sells American products from Costco/Sam's Club to Vietnamese customers.

CRITICAL INSTRUCTION: You MUST closely mimic the writing style, tone, emoji usage, and formatting of the example posts provided below. Study them carefully and replicate their style exactly.

AUDIENCE: Vietnamese people in Vietnam who want authentic American products
BUSINESS MODEL: Find deals at wholesale stores, post to Facebook Group, take orders, ship to Vietnam

${examplePosts.length > 0 ? `
===== EXAMPLE POSTS TO MIMIC =====
Below are ${examplePosts.length} example posts. Study their style carefully:
- Note their exact emoji usage and placement
- Observe how they mix Vietnamese and English
- Notice their sentence structure and length
- Pay attention to their tone and enthusiasm level
- See how they present prices and discounts
- Follow their hashtag style

${examplesText}

===== END OF EXAMPLES =====
` : ''}

NOW GENERATE A POST FOR THIS PRODUCT:
Product Name: ${product.product_name}
${product.brand ? `Brand: ${product.brand}` : ''}
${product.sku ? `Item #: ${product.sku}` : ''}
Category: ${product.category}
${product.size ? `Size/Quantity: ${product.size}` : ''}
${product.quantity ? `Package: ${product.quantity}` : ''}
Current Price: $${product.current_price}
Original Price: $${product.original_price}
Discount: ${product.discount_percent}%
${product.product_details ? `Additional Details: ${product.product_details}` : ''}

REQUIREMENTS:
1. MATCH THE STYLE of the example posts above as closely as possible
2. Use the EXACT product information provided (name, brand, size, prices)
3. Use the SAME emoji density and types as the examples
4. Follow the SAME sentence structure and flow as the examples
5. Convert USD to VND (multiply by ~25,000)
6. Use the SAME Vietnamese phrases and expressions as the examples
7. Follow the SAME hashtag style as the examples

Return ONLY the post text with no additional commentary or explanation.`;

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
