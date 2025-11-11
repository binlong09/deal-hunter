import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY is not set - OCR will not work');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
});

export interface ProductInfo {
  product_name: string;
  category: string;
  sku?: string;
  current_price?: number;
  original_price?: number;
  discount_percent?: number;
  brand?: string;
  size?: string;
  quantity?: string;
  unit?: string;
  confidence: number;
}

export async function extractProductInfo(imageUrl: string): Promise<ProductInfo> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = response.headers.get('content-type') || 'image/jpeg';

    // Use Claude's vision to extract product information
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Analyze this product image from Costco or Sam's Club and extract the following information:

1. Product category - Determine the category based on the product type:
   - "supplements" for vitamins, minerals, protein powder, health supplements
   - "baby" for baby formula, diapers, baby food, baby care products
   - "cosmetics" for makeup, skincare, hair care, beauty products
   - "food" for groceries, snacks, beverages
   - "household" for cleaning supplies, paper products, detergent
   - "personal_care" for toiletries, hygiene products (non-cosmetic)
   - "electronics" for tech products, gadgets
   - "other" if it doesn't fit the above

2. Product name (full name as shown on label)
3. SKU/Item number
4. Current price (sale price if shown)
5. Original price (if different from current)
6. Discount percentage (if shown)
7. Brand name
8. Size/quantity (e.g., "100 tablets", "32 oz", etc.)
9. Unit information

Look for:
- Price tags (usually red for sale items)
- Item numbers (usually 6-7 digits)
- Product labels and descriptions
- Any discount or savings information

Return the information in this EXACT JSON format (no additional text):
{
  "product_name": "exact product name",
  "category": "supplements",
  "sku": "item number",
  "current_price": 19.99,
  "original_price": 29.99,
  "discount_percent": 33,
  "brand": "brand name",
  "size": "size with unit",
  "quantity": "number of items",
  "unit": "tablets/oz/count",
  "confidence": 0.9
}

If any field is not clearly visible, omit it or set to null. Set confidence (0-1) based on how clear the text is.`,
            },
          ],
        },
      ],
    });

    // Parse the response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from the response (handle cases where Claude adds explanation)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from response');
    }

    const extracted = JSON.parse(jsonMatch[0]) as ProductInfo;

    // Validate and clean up the data
    return {
      product_name: extracted.product_name || 'Unknown Product',
      category: extracted.category || 'other',
      sku: extracted.sku || undefined,
      current_price: extracted.current_price ? Number(extracted.current_price) : undefined,
      original_price: extracted.original_price ? Number(extracted.original_price) : undefined,
      discount_percent: extracted.discount_percent ? Number(extracted.discount_percent) : undefined,
      brand: extracted.brand || undefined,
      size: extracted.size || undefined,
      quantity: extracted.quantity || undefined,
      unit: extracted.unit || undefined,
      confidence: extracted.confidence || 0.5,
    };
  } catch (error) {
    console.error('OCR error:', error);
    // Return default values instead of throwing
    return {
      product_name: 'Unknown Product',
      category: 'other',
      confidence: 0,
    };
  }
}
