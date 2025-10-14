USE fashion_ecommerce;

INSERT INTO products (category_id, title, price, discount, description, thumbnail)
VALUES
((SELECT category_id FROM categories WHERE name='T-shirts'), 'Basic T-Shirt', 150000, 0, '100% cotton T-shirt', '/public/uploads/shirt1.png'),
((SELECT category_id FROM categories WHERE name='Jeans'), 'Slim Blue Jeans', 350000, 10, 'Slim-fit blue jeans', '/public/uploads/jean.png'),
((SELECT category_id FROM categories WHERE name='Jackets'), 'White Sneakers', 500000, 5, 'Classic white sneakers', '/public/uploads/jacket.png'),
((SELECT category_id FROM categories WHERE name='T-shirts'), 'Fleece Hoodie', 420000, 0, 'Warm fleece hoodie', '/public/uploads/shirt2.png'),
((SELECT category_id FROM categories WHERE name='Shirts'), 'Basic Polo Shirt', 220000, 5, 'Stretch cotton polo', '/public/uploads/shirt2.png'),
((SELECT category_id FROM categories WHERE name='Shorts'), 'Cargo Shorts', 280000, 0, 'Durable cotton cargo shorts', '/public/uploads/short.png'),
((SELECT category_id FROM categories WHERE name='Jackets'), 'Windbreaker Jacket', 650000, 0, 'Water-resistant jacket', '/public/uploads/jacket.png');

INSERT INTO product_variants (product_id, size, color, sku, price, stock)
VALUES
((SELECT product_id FROM products WHERE title='Basic T-Shirt'), 'M', 'White', 'TSHIRT-M-WHITE', 150000, 20),
((SELECT product_id FROM products WHERE title='Basic T-Shirt'), 'L', 'Black', 'TSHIRT-L-BLACK', 150000, 15),
((SELECT product_id FROM products WHERE title='Slim Blue Jeans'), '32', 'Blue', 'JEAN-32-BLUE', 350000, 10),
((SELECT product_id FROM products WHERE title='White Sneakers'), '41', 'White', 'SNEAKER-41-WHITE', 500000, 8),
((SELECT product_id FROM products WHERE title='Windbreaker Jacket'), 'L', 'Black', 'JACKET-L-BLACK', 650000, 11);

INSERT INTO cart_items (user_id, variant_id, quantity, price_snapshot)
VALUES
((SELECT user_id FROM users WHERE email='tienanh@gmail.com'),
 (SELECT variant_id FROM product_variants WHERE sku='TSHIRT-M-WHITE'), 2, 150000),
((SELECT user_id FROM users WHERE email='tienanh@gmail.com'),
 (SELECT variant_id FROM product_variants WHERE sku='JEAN-32-BLUE'), 1, 350000);

INSERT INTO orders (user_id, address, note, status, total_price)
VALUES
((SELECT user_id FROM users WHERE email='tienanh@gmail.com'),
 '12 Ly Thuong Kiet Street', 'Morning delivery', 'pending', 650000);

INSERT INTO order_items (order_id, variant_id, quantity, price)
VALUES
(1, (SELECT variant_id FROM product_variants WHERE sku='TSHIRT-M-WHITE'), 2, 150000),
(1, (SELECT variant_id FROM product_variants WHERE sku='JEAN-32-BLUE'), 1, 350000);

INSERT INTO reviews (user_id, product_id, order_item_id, rating, title, content, status)
VALUES
((SELECT user_id FROM users WHERE email='tienanh@gmail.com'),
 (SELECT product_id FROM products WHERE title='Basic T-Shirt'),
 (SELECT order_item_id FROM order_items WHERE variant_id=(SELECT variant_id FROM product_variants WHERE sku='TSHIRT-M-WHITE') LIMIT 1),
 5, 'Great T-shirt', 'Soft and comfortable.', 'approved'),
((SELECT user_id FROM users WHERE email='tienanh@gmail.com'),
 (SELECT product_id FROM products WHERE title='Slim Blue Jeans'),
 (SELECT order_item_id FROM order_items WHERE variant_id=(SELECT variant_id FROM product_variants WHERE sku='JEAN-32-BLUE') LIMIT 1),
 4, 'Good fit', 'Nice fabric and fit.', 'approved');