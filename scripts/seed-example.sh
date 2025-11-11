#!/bin/bash

# Seed example post to Turso database
# Usage: ./scripts/seed-example.sh

echo "Seeding example post to Turso database..."

turso db shell deal-hunter << 'EOF'
-- Add a sample example post for supplements
INSERT INTO example_posts (product_category, product_type, post_text, emoji_density) VALUES
('supplements', 'vitamins', '🔥 FLASH DEAL - Nature Made Vitamin D3 💊

Hàng chính hãng từ Costco US 🇺🇸
Giá gốc: $25.99
Giá sale: $18.99 💰
Tiết kiệm: 27% 📉

✅ 400 viên - dùng cả năm
✅ 2000 IU - liều lượng chuẩn FDA
✅ Authentic từ Mỹ, ship 2-3 tuần

Comment "ĐẶT" để order ngay! 🛒

#vitamind #supplements #costcodeal #dealhunter #hangmy', 0.15);

-- Add a sample for baby products
INSERT INTO example_posts (product_category, product_type, post_text, emoji_density) VALUES
('baby', 'diapers', '🎉 DEAL ALERT - Huggies Little Snugglers 👶

Bỉm Mỹ cao cấp cho bé yêu! 🇺🇸
Size: Newborn - Size 6
Giá: $39.99 (Giảm 30% từ $57.99) 💸

✨ Mềm mại như bông
✨ Không kích ứng da
✨ Thấm hút siêu tốt
✨ Authentic 100%

Giao hàng 2-3 tuần! 🚚
Comment "ORDER" để đặt ngay nha!

#huggies #bimmy #babydeal #costco', 0.12);

-- Add a sample for cosmetics
INSERT INTO example_posts (product_category, product_type, post_text, emoji_density) VALUES
('cosmetics', 'skincare', '💄 HOT DEAL - CeraVe Facial Cleanser ✨

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

#cerave #skincare #cosmetics #dealusa', 0.14);

.quit
EOF

echo ""
echo "✅ Successfully added 3 example posts!"
echo ""
echo "View them at: http://localhost:3000/admin/examples"
echo "Or check in Turso: turso db shell deal-hunter"
