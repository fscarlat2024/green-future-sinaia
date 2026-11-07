-- Meniul bistroului trece in baza de date, ca Attitude sa il administreze din panou.
CREATE TABLE menu_categories (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  name_ro TEXT NOT NULL,
  name_en TEXT NOT NULL
);
CREATE TABLE menu_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES menu_categories(id),
  position INTEGER NOT NULL,
  price INTEGER NOT NULL,
  name_ro TEXT NOT NULL,
  name_en TEXT NOT NULL,
  desc_ro TEXT,
  desc_en TEXT,
  allergens_ro TEXT,
  allergens_en TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sold_out_on TEXT                     -- data pana la care e epuizat; a doua zi revine singur
);
CREATE INDEX menu_items_cat ON menu_items(category_id, position);
CREATE TABLE menu_photos (
  item_id TEXT PRIMARY KEY REFERENCES menu_items(id),
  data BLOB NOT NULL,
  updated_at INTEGER NOT NULL
);
-- gol = comenzi oricand, pana cand Attitude isi pune programul
CREATE TABLE bistro_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  open_from TEXT,
  open_to TEXT
);
INSERT INTO bistro_settings (id) VALUES (1);
INSERT INTO menu_categories (id, position, name_ro, name_en) VALUES ('mic-dejun', 0, 'Mic dejun', 'Breakfast');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('omleta', 'mic-dejun', 0, 35, 'Omletă țărănească', 'Traditional omelette', 'bacon, telemea de vacă, legume, pâine prăjită', 'bacon, cheese, vegetables, toast', 'gluten, ou, lactoză', 'gluten, egg, lactose');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('scrambled-somon', 'mic-dejun', 1, 56, 'Scrambled eggs cu somon și avocado', 'Scrambled eggs with salmon and avocado', 'somon afumat, avocado, pâine prăjită', 'smoked salmon, avocado, toast', 'ou, gluten, lactoză, sulfiți, pește', 'egg, gluten, lactose, sulphites, fish');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('benedict', 'mic-dejun', 2, 45, 'Eggs Benedict', 'Eggs Benedict', 'ouă poșate, șuncă, sos olandez', 'poached eggs, ham, hollandaise', 'ou, gluten, lactoză, sulfiți', 'egg, gluten, lactose, sulphites');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('florentine', 'mic-dejun', 3, 60, 'Eggs Florentine', 'Eggs Florentine', 'ouă poșate, spanac, somon afumat, sos olandez', 'poached eggs, spinach, smoked salmon, hollandaise', 'ou, lactoză, gluten, sulfiți, pește', 'egg, lactose, gluten, sulphites, fish');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('shakshuka', 'mic-dejun', 4, 60, 'Shakshuka cu roșii', 'Shakshuka with tomatoes', 'ouă coapte în sos de roșii, ardei kapia, pâine prăjită', 'eggs baked in tomato sauce, kapia pepper, toast', 'ou, sulfiți, gluten', 'egg, sulphites, gluten');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('club-sandwich', 'mic-dejun', 5, 45, 'Club sandwich', 'Club sandwich', 'piept de pui, bacon, ou, salată, cartofi prăjiți', 'chicken breast, bacon, egg, salad, French fries', 'gluten, lactoză, ou, sulfiți', 'gluten, lactose, egg, sulphites');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('croque', 'mic-dejun', 6, 35, 'Croque monsieur', 'Croque monsieur', 'șuncă, cașcaval, béchamel, cartofi prăjiți', 'ham, cheese, béchamel, French fries', 'gluten, ou, lactoză', 'gluten, egg, lactose');
INSERT INTO menu_categories (id, position, name_ro, name_en) VALUES ('supe', 1, 'Supe și ciorbe', 'Soups');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('supa-pui', 'supe', 0, 25, 'Supă de pui cu tăiței de casă', 'Chicken soup with homemade noodles', 'piept de pui, tăiței, legume', 'chicken breast, noodles, vegetables', 'ou, lapte, gluten, țelină, sulfiți', 'egg, milk, gluten, celery, sulphites');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('ciorba-fasole', 'supe', 1, 35, 'Ciorbă de fasole cu afumătură', 'Bean soup with smoked meat', 'fasole, ciolan afumat, leuștean', 'beans, smoked pork hock, lovage', 'țelină, sulfiți', 'celery, sulphites');
INSERT INTO menu_categories (id, position, name_ro, name_en) VALUES ('principale', 2, 'Feluri principale', 'Main courses');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('burger', 'principale', 0, 60, 'Burger de vită', 'Beef burger', 'vită, dulceață de ceapă, cheddar, bacon, ou', 'beef, onion jam, cheddar, bacon, egg', 'gluten, lapte, ou, muștar, susan, sulfiți', 'gluten, milk, egg, mustard, sesame, sulphites');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('gulas', 'principale', 1, 60, 'Gulaș de vită cu couscous', 'Beef goulash with couscous', 'vită, ardei kapia, boia, legume, couscous', 'beef, kapia pepper, paprika, vegetables, couscous', 'gluten, soia, țelină, sulfiți', 'gluten, soy, celery, sulphites');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('coasta', 'principale', 2, 70, 'Coastă de porc BBQ', 'BBQ pork ribs', 'gătită lent, sos BBQ, susan', 'slow-cooked, BBQ sauce, sesame', 'soia, susan, sulfiți, muștar', 'soy, sesame, sulphites, mustard');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('ciolan', 'principale', 3, 60, 'Ciolan de porc cu cartofi zdrobiți', 'Pork knuckle with crushed potatoes', 'rozmarin, usturoi, cartofi', 'rosemary, garlic, potatoes', 'gluten, țelină, soia, sulfiți', 'gluten, celery, soy, sulphites');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('snitel', 'principale', 4, 40, 'Șnițel de pui cu cartofi prăjiți', 'Chicken schnitzel with French fries', 'piept de pui în panko, cartofi', 'panko chicken breast, fries', 'gluten, lapte, muștar, ou, sulfiți', 'gluten, milk, mustard, egg, sulphites');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('pui-gratar', 'principale', 5, 28, 'Piept de pui la grătar', 'Grilled chicken breast', '250 g', '250 g', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('paste-trufe', 'principale', 6, 55, 'Paste cu pui și trufe', 'Chicken and truffle pasta', 'penne, pastă de trufe, parmezan', 'penne, truffle paste, parmesan', 'gluten, lapte, sulfiți, muștar, ou', 'gluten, milk, sulphites, mustard, egg');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('paste-marinara', 'principale', 7, 50, 'Paste cu pui în sos marinara', 'Chicken marinara pasta', 'penne, sos de roșii, parmezan', 'penne, tomato sauce, parmesan', 'gluten, lapte, sulfiți', 'gluten, milk, sulphites');
INSERT INTO menu_categories (id, position, name_ro, name_en) VALUES ('salate', 3, 'Salate', 'Salads');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('caesar', 'salate', 0, 35, 'Salată Caesar', 'Caesar salad', 'piept de pui, crutoane, parmezan', 'chicken breast, croutons, parmesan', 'muștar, pește, ou, lapte, gluten, sulfiți', 'mustard, fish, egg, milk, gluten, sulphites');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('ton-avocado', 'salate', 1, 45, 'Salată cu ton și avocado', 'Tuna and avocado salad', 'ton, avocado, dressing de lămâie', 'tuna, avocado, lemon dressing', 'pește, sulfiți', 'fish, sulphites');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('greceasca', 'salate', 2, 30, 'Salată grecească', 'Greek salad', 'roșii, castraveți, măsline Kalamata, feta', 'tomatoes, cucumbers, Kalamata olives, feta', 'lactoză, sulfiți', 'lactose, sulphites');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('mixta', 'salate', 3, 20, 'Salată mixtă', 'Mixed salad', 'legume de sezon, dressing de lămâie', 'seasonal vegetables, lemon dressing', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('vara', 'salate', 4, 20, 'Salată de vară', 'Summer salad', 'roșii, castraveți, ardei kapia, telemea', 'tomatoes, cucumbers, kapia pepper, white cheese', 'lactoză', 'lactose');
INSERT INTO menu_categories (id, position, name_ro, name_en) VALUES ('garnituri', 4, 'Garnituri', 'Side dishes');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('cartofi-prajiti', 'garnituri', 0, 25, 'Cartofi prăjiți', 'French fries', '200 g', '200 g', 'gluten', 'gluten');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('cartofi-usturoi', 'garnituri', 1, 25, 'Cartofi zdrobiți cu usturoi', 'Garlic crushed potatoes', '300 g', '300 g', 'gluten', 'gluten');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('cartofi-rozmarin', 'garnituri', 2, 25, 'Cartofi cu rozmarin', 'Rosemary potatoes', '400 g', '400 g', 'gluten', 'gluten');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('legume-grill', 'garnituri', 3, 30, 'Legume grill', 'Grilled vegetables', '200 g', '200 g', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('piure', 'garnituri', 4, 37, 'Piure de cartofi', 'Mashed potatoes', 'cu unt și lapte', 'with butter and milk', 'lapte, gluten', 'milk, gluten');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('orez', 'garnituri', 5, 20, 'Orez basmati', 'Basmati rice', '100 g', '100 g', 'gluten', 'gluten');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('couscous', 'garnituri', 6, 20, 'Couscous', 'Couscous', '100 g', '100 g', 'gluten', 'gluten');
INSERT INTO menu_categories (id, position, name_ro, name_en) VALUES ('desert', 5, 'Desert', 'Dessert');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('suzette', 'desert', 0, 45, 'Crêpes Suzette', 'Crêpes Suzette', 'Grand Marnier, portocale, mascarpone', 'Grand Marnier, orange, mascarpone', 'lapte, gluten, ou, sulfiți', 'milk, gluten, egg, sulphites');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('clatite', 'desert', 1, 35, 'Clătite cu ciocolată', 'Chocolate crêpes', 'umplute cu ciocolată', 'filled with chocolate', 'lapte, gluten, ou, alune', 'milk, gluten, egg, nuts');
INSERT INTO menu_categories (id, position, name_ro, name_en) VALUES ('racoritoare', 6, 'Răcoritoare', 'Soft drinks');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('apa-500', 'racoritoare', 0, 12, 'Apă Dorna', 'Dorna water', 'plată sau minerală, 500 ml', 'still or sparkling, 500 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('cola-500', 'racoritoare', 1, 17, 'Coca-Cola / Coca-Cola Zero', 'Coca-Cola / Coca-Cola Zero', '500 ml', '500 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('fuzetea-500', 'racoritoare', 2, 15, 'Fuzetea', 'Fuzetea', 'lămâie sau piersici, 500 ml', 'lemon or peach, 500 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('limonada', 'racoritoare', 3, 25, 'Limonadă clasică', 'Classic lemonade', '250 ml', '250 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('limonada-fructe', 'racoritoare', 4, 29, 'Limonadă cu fructe', 'Fruit lemonade', 'mango, căpșuni sau fructul pasiunii, 250 ml', 'mango, strawberry or passion fruit, 250 ml', NULL, NULL);
INSERT INTO menu_categories (id, position, name_ro, name_en) VALUES ('cafea', 7, 'Cafea și ceai', 'Coffee and tea');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('espresso', 'cafea', 0, 11, 'Espresso', 'Espresso', '30 ml', '30 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('cappuccino', 'cafea', 1, 20, 'Cappuccino', 'Cappuccino', '150 ml', '150 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('flat-white', 'cafea', 2, 22, 'Flat white', 'Flat white', '130 ml', '130 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('latte', 'cafea', 3, 23, 'Caffè latte', 'Caffè latte', '180 ml', '180 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('ciocolata', 'cafea', 4, 22, 'Ciocolată caldă', 'Hot chocolate', '200 ml', '200 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('ceai', 'cafea', 5, 13, 'Ceai de fructe', 'Fruit tea', '250 ml', '250 ml', NULL, NULL);
INSERT INTO menu_categories (id, position, name_ro, name_en) VALUES ('vin-cocktail', 8, 'Vin, bere și cocktailuri', 'Wine, beer and cocktails');
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('heineken', 'vin-cocktail', 0, 16, 'Heineken', 'Heineken', '330 ml', '330 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('vin-pahar', 'vin-cocktail', 1, 25, 'Vin Recaș la pahar', 'Recaș wine by the glass', 'alb sau rosé, 187 ml', 'white or rosé, 187 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('prosecco', 'vin-cocktail', 2, 25, 'Prosecco Grande Vento', 'Prosecco Grande Vento', '200 ml', '200 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('vin-sticla', 'vin-cocktail', 3, 120, 'Bojan Clasic Merlot și Cabernet', 'Bojan Clasic Merlot and Cabernet', 'sec, 750 ml', 'dry, 750 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('aperol', 'vin-cocktail', 4, 38, 'Aperol Spritz', 'Aperol Spritz', '250 ml', '250 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('mojito', 'vin-cocktail', 5, 38, 'Mojito', 'Mojito', '180 ml', '180 ml', NULL, NULL);
INSERT INTO menu_items (id, category_id, position, price, name_ro, name_en, desc_ro, desc_en, allergens_ro, allergens_en) VALUES ('gin-tonic', 'vin-cocktail', 6, 32, 'Gin tonic', 'Gin tonic', '200 ml', '200 ml', NULL, NULL);
