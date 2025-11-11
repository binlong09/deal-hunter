# How to Add Example Posts

The AI learns from your example posts to match your tone, emoji usage, and style. Here's how to add them:

## Method 1: Using the Web UI (Easiest)

### Step 1: Navigate to Example Posts Manager
1. Start your dev server: `npm run dev`
2. Open http://localhost:3000
3. Click **"Manage Examples"** button

### Step 2: Add an Example Post
1. Click the **"+ Add Example"** button
2. Fill in the form:
   - **Product Category**: supplements, baby, or cosmetics (optional)
   - **Product Type**: e.g., "vitamins", "diapers", "skincare" (optional)
   - **Post Text**: Paste your actual Facebook post (REQUIRED)
   - **Style Notes**: e.g., "Casual tone, lots of emojis" (optional)

### Step 3: Save and Activate
1. Click **"Create Example Post"**
2. The post will be marked as "Active" by default
3. The AI will now learn from this example!

### Managing Examples
- **Toggle Active/Inactive**: Click the status button to turn examples on/off
- **Delete**: Remove examples you no longer want the AI to learn from
- **Add Multiple**: Add 3-5 examples for best results

## Method 2: Using Database Directly

### Via Turso CLI

```bash
# Open Turso shell
turso db shell deal-hunter

# Add an example post
INSERT INTO example_posts (product_category, product_type, post_text, emoji_density) VALUES
('supplements', 'vitamins',
'🔥 FLASH DEAL - Nature Made Vitamin D3 💊

Hàng chính hãng từ Costco US 🇺🇸
Giá gốc: $25.99
Giá sale: $18.99 💰
Tiết kiệm: 27% 📉

✅ 400 viên - dùng cả năm
✅ 2000 IU - liều lượng chuẩn FDA
✅ Authentic từ Mỹ, ship 2-3 tuần

Comment "ĐẶT" để order ngay! 🛒

#vitamind #supplements #costcodeal #dealhunter #hangmy',
0.15);

# Exit
.quit
```

### Via SQL File

Create a file `examples.sql`:

```sql
INSERT INTO example_posts (product_category, product_type, post_text, emoji_density) VALUES
-- Example 1: Supplements
('supplements', 'vitamins',
'🔥 FLASH DEAL - Nature Made Vitamin D3 💊

Hàng chính hãng từ Costco US 🇺🇸
Giá gốc: $25.99
Giá sale: $18.99 💰
Tiết kiệm: 27% 📉

✅ 400 viên - dùng cả năm
✅ 2000 IU - liều lượng chuẩn FDA
✅ Authentic từ Mỹ, ship 2-3 tuần

Comment "ĐẶT" để order ngay! 🛒

#vitamind #supplements #costcodeal #dealhunter #hangmy',
0.15),

-- Example 2: Baby Products
('baby', 'diapers',
'🎉 DEAL ALERT - Huggies Little Snugglers 👶

Bỉm Mỹ cao cấp cho bé yêu! 🇺🇸
Size: Newborn - Size 6
Giá: $39.99 (Giảm 30% từ $57.99) 💸

✨ Mềm mại như bông
✨ Không kích ứng da
✨ Thấm hút siêu tốt
✨ Authentic 100%

Giao hàng 2-3 tuần! 🚚
Comment "ORDER" để đặt ngay nha!

#huggies #bimmy #babydeal #costco',
0.12),

-- Example 3: Cosmetics
('cosmetics', 'skincare',
'💄 HOT DEAL - CeraVe Facial Cleanser ✨

Sữa rửa mặt #1 của Mỹ! 🇺🇸
Giá gốc: $18.99
Giá sale: $12.99 📉
Save: 32% 🎊

✅ 16 oz - dùng 6 tháng
✅ Không gây mụn
✅ Dành cho da nhạy cảm
✅ Chính hãng Mỹ

Ship về 2-3 tuần nha! 🚢
Inbox hoặc comment "MUA" để order! 💌

#cerave #skincare #cosmetics #dealusa',
0.14);
```

Then run:
```bash
turso db shell deal-hunter < examples.sql
```

## Method 3: Using the Seed Script

If you just want to add the default examples:

```bash
./scripts/seed-example.sh
```

This will add 3 example posts (one for each category).

## Best Practices for Example Posts

### 1. Use Your Actual Posts
- Copy posts that performed well on Facebook
- Include posts that got lots of orders
- Mix different product types

### 2. Show Variety
- Different emoji densities (light, medium, heavy)
- Different lengths (short, medium, long)
- Different tones (excited, informative, urgent)

### 3. Include Key Elements
- **Vietnamese-English mix**: "Hàng chính hãng", "authentic"
- **Prices**: Both USD and VND
- **Call-to-action**: Comment "ĐẶT", "ORDER", "MUA"
- **Hashtags**: 3-5 relevant tags
- **Emojis**: 🔥💊💰📉✅🚚 etc.
- **Shipping info**: "2-3 weeks", "ship về Vietnam"

### 4. Organize by Category
- **supplements**: Focus on health benefits, FDA approval
- **baby**: Emphasize safety, softness, authentic
- **cosmetics**: Highlight brand reputation, results

## How Many Examples Should You Add?

### Minimum (3 posts)
- 1 post per category (supplements, baby, cosmetics)
- AI will generate decent posts

### Recommended (5-10 posts)
- 2-3 posts per category
- Shows variety in tone and style
- AI learns your patterns better

### Optimal (10-20 posts)
- Multiple examples per product type
- Different occasions (regular, flash sale, clearance)
- Best results for matching your voice

## Verifying Examples Are Working

### Check in the UI
1. Go to http://localhost:3000/admin/examples
2. Verify your posts are listed
3. Ensure they're marked as "Active"

### Test AI Generation
1. Go to `/generate`
2. Select a product
3. Click "Generate Posts"
4. Check if the generated post matches your style

### Check via Database
```bash
turso db shell deal-hunter

# Count active examples
SELECT COUNT(*) as total FROM example_posts WHERE is_active = 1;

# View all examples
SELECT id, product_category, LEFT(post_text, 50) as preview
FROM example_posts
WHERE is_active = 1;

.quit
```

## Example Post Template

Here's a template you can modify:

```
🔥 [DEAL TYPE] - [PRODUCT NAME] [EMOJI]

Hàng chính hãng từ [STORE] US 🇺🇸
Giá gốc: $[ORIGINAL]
Giá sale: $[CURRENT] 💰
Tiết kiệm: [PERCENT]% 📉

✅ [BENEFIT 1]
✅ [BENEFIT 2]
✅ [BENEFIT 3]
✅ Authentic từ Mỹ, ship 2-3 tuần

Comment "[CTA]" để order ngay! 🛒

#[hashtag1] #[hashtag2] #[hashtag3]
```

## Troubleshooting

### Generated posts don't match my style
- **Add more examples**: 3-5 minimum
- **Check examples are active**: Toggle status in UI
- **Verify examples are diverse**: Different tones and lengths

### AI is too formal/informal
- **Add examples with desired tone**: Copy your best posts
- **Update style notes**: Add guidance like "casual", "excited", "professional"

### Missing Vietnamese phrases
- **Ensure examples have Vietnamese**: "hàng chính hãng", "tiết kiệm", etc.
- **Add more bilingual examples**: Natural Vietnamese-English mix

### Wrong emoji usage
- **Add examples with your emoji style**: The AI learns patterns
- **Adjust emoji_density field**: 0.1 (light), 0.15 (medium), 0.2 (heavy)

## Advanced: Emoji Density

The `emoji_density` field helps the AI understand how many emojis to use:

- **0.05-0.10**: Light emoji use (professional)
- **0.10-0.15**: Moderate emoji use (friendly)
- **0.15-0.20**: Heavy emoji use (excited, enthusiastic)

Calculate by: (number of emojis / total words)

Example:
```
"🔥 DEAL - Product 💊 ✅ Benefit" = 3 emojis / 6 words = 0.5 (very high)
```

## Quick Start Checklist

To get the best AI results:

- [ ] Add at least 3 example posts (one per category)
- [ ] Use your actual successful Facebook posts
- [ ] Verify posts are marked as "Active"
- [ ] Include Vietnamese-English mix
- [ ] Show price in both USD and VND
- [ ] Include call-to-action
- [ ] Add relevant hashtags
- [ ] Test generation and refine

---

**Remember**: The more examples you provide, the better the AI will match your unique voice and style!

Need help? Check the example posts at `/admin/examples` to see what's currently being used.
