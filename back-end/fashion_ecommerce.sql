CREATE DATABASE fashion_ecommerce;
USE fashion_ecommerce;

-- Roles
CREATE TABLE roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles (name) VALUES ('admin'), ('customer');

-- Users
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  fullname VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone_number VARCHAR(20),
  address VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),
  role_id INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- fullname: Tien Anh, email: tienanh@gmail.com, pass: Tienanh209
-- fullname: Phuong Thao, email: phuongthao@gmail.com, pass: Phuongthao123
-- fullname: Apple, email: apple@gmail.com, pass: Apple123
select * from users;

update users set role_id  = 1 where email="tienanh@gmail.com";

-- Categories
CREATE TABLE categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO categories (name) VALUES ("T-shirts"), ("Shirts"), ("Jeans"), ("Shorts"), ("Jackets");

-- Products
CREATE TABLE products (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT,
  title VARCHAR(255) NOT NULL,
  price INT NOT NULL,
  discount INT DEFAULT 0,
  description TEXT,
  thumbnail VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Product variants
CREATE TABLE product_variants (
  variant_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT,
  size VARCHAR(20),
  color VARCHAR(50),
  sku VARCHAR(64) UNIQUE,
  price INT NULL,
  stock INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Galleries
CREATE TABLE galleries (
  gallery_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  thumbnail VARCHAR(255) NOT NULL,
  CONSTRAINT fk_galleries_product FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cart items
CREATE TABLE cart_items (
  cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  variant_id INT,
  quantity INT NOT NULL CHECK (quantity > 0),
  price_snapshot INT NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_cartitems_variant FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders
CREATE TABLE orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  address VARCHAR(255) NOT NULL,
  note VARCHAR(255),
  status ENUM('pending','paid','shipped','completed','cancelled') NOT NULL DEFAULT 'pending',
  total_price INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order items
CREATE TABLE order_items (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  variant_id INT,
  quantity INT NOT NULL,
  price INT NOT NULL,
  CONSTRAINT fk_orderitems_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_orderitems_variant FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reviews
CREATE TABLE reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  order_item_id INT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(150) NULL,
  content TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT fk_reviews_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id),
  UNIQUE KEY uq_reviews_order_item (order_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Brands
CREATE TABLE brands (
  brand_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE products
  ADD COLUMN brand_id INT NULL AFTER category_id,
  ADD COLUMN gender ENUM('male','female','unisex') NOT NULL DEFAULT 'unisex' AFTER title,
  ADD CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(brand_id);
  
INSERT INTO brands (name) VALUES ('Nike'),('Adidas'),('Uniqlo'),('Zara'),('H&M');

select * from products;

-- Virtual try-on history
CREATE TABLE history_images (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
