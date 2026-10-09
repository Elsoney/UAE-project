-- =============================================================================
-- Development seed data — PLACEHOLDER CATALOG ONLY
-- =============================================================================
-- Demo menu and catering packages for local development and tests. Names,
-- descriptions and prices are placeholders until the owner supplies the
-- approved bilingual menu. Contains NO customer data and NO commission
-- settings (the commission rate is an owner decision; nothing is defaulted).
-- Prices are AED fils (1 AED = 100 fils).

insert into public.categories (slug, name_en, name_ar, sort_order) values
  ('breakfast',  'Breakfast',          'الفطور',            1),
  ('mains',      'Main Dishes',        'الأطباق الرئيسية',   2),
  ('grills',     'Grills',             'المشويات',          3),
  ('desserts',   'Desserts & Drinks',  'الحلويات والمشروبات', 4);

insert into public.menu_items
  (category_id, slug, name_en, name_ar, description_en, description_ar, price_fils, sort_order)
select c.id, v.slug, v.name_en, v.name_ar, v.description_en, v.description_ar, v.price_fils, v.sort_order
from (values
  ('breakfast', 'balaleet', 'Balaleet', 'بلاليط',
   'Sweet saffron vermicelli topped with a thin omelette.',
   'شعيرية حلوة بالزعفران تعلوها طبقة رقيقة من البيض.', 2800, 1),
  ('breakfast', 'chebab', 'Chebab Pancakes', 'خبز الجباب',
   'Emirati cardamom pancakes served with date syrup and cheese.',
   'فطائر إماراتية بالهيل تقدم مع دبس التمر والجبن.', 2600, 2),
  ('breakfast', 'shakshuka', 'Shakshuka', 'شكشوكة',
   'Eggs poached in a spiced tomato and pepper sauce.',
   'بيض مطهو في صلصة الطماطم والفلفل المتبلة.', 2400, 3),
  ('mains', 'chicken-machboos', 'Chicken Machboos', 'مجبوس دجاج',
   'Spiced rice with slow-cooked chicken, loomi and fried onions.',
   'أرز متبل مع دجاج مطهو ببطء ولومي وبصل مقرمش.', 4200, 1),
  ('mains', 'lamb-ouzi', 'Lamb Ouzi', 'قوزي لحم',
   'Tender lamb over fragrant rice with nuts and raisins.',
   'لحم ضأن طري على أرز عطري مع المكسرات والزبيب.', 6500, 2),
  ('mains', 'harees', 'Harees', 'هريس',
   'Slow-cooked wheat and meat, a traditional Emirati favourite.',
   'قمح ولحم مطهوان ببطء، طبق إماراتي تقليدي محبوب.', 3500, 3),
  ('grills', 'mixed-grill', 'Mixed Grill Platter', 'طبق مشاوي مشكلة',
   'Shish tawook, kebab and lamb chops with grilled vegetables.',
   'شيش طاووق وكباب وريش ضأن مع خضار مشوية.', 7800, 1),
  ('grills', 'shish-tawook', 'Shish Tawook', 'شيش طاووق',
   'Marinated chicken skewers with garlic sauce and bread.',
   'أسياخ دجاج متبلة مع صلصة الثوم والخبز.', 3800, 2),
  ('grills', 'grilled-hammour', 'Grilled Hammour', 'هامور مشوي',
   'Fresh Gulf hammour with lemon, herbs and rice.',
   'هامور خليجي طازج مع الليمون والأعشاب والأرز.', 6900, 3),
  ('desserts', 'luqaimat', 'Luqaimat', 'لقيمات',
   'Crispy sweet dumplings drizzled with date syrup.',
   'كرات عجين مقرمشة محلاة بدبس التمر.', 1800, 1),
  ('desserts', 'umm-ali', 'Umm Ali', 'أم علي',
   'Warm bread pudding with milk, nuts and coconut.',
   'حلوى دافئة من الخبز والحليب والمكسرات وجوز الهند.', 2200, 2),
  ('desserts', 'karak-tea', 'Karak Tea', 'شاي كرك',
   'Strong spiced tea with milk and cardamom.',
   'شاي قوي متبل بالحليب والهيل.', 600, 3)
) as v(category_slug, slug, name_en, name_ar, description_en, description_ar, price_fils, sort_order)
join public.categories c on c.slug = v.category_slug;

insert into public.catering_packages
  (slug, name_en, name_ar, description_en, description_ar,
   included_items_en, included_items_ar, terms_en, terms_ar,
   base_price_fils, price_per_guest_fils, minimum_guests, maximum_guests, sort_order)
values
  ('family-gathering', 'Family Gathering', 'تجمع عائلي',
   'A generous home-style spread for family occasions.',
   'مائدة سخية على الطريقة المنزلية للمناسبات العائلية.',
   array['Chicken machboos', 'Salads and mezze', 'Luqaimat', 'Karak tea'],
   array['مجبوس دجاج', 'سلطات ومقبلات', 'لقيمات', 'شاي كرك'],
   'Final price confirmed by the restaurant after review. Delivery within Ajman.',
   'يؤكد المطعم السعر النهائي بعد المراجعة. التوصيل داخل عجمان.',
   150000, 4500, 15, 40, 1),
  ('corporate-lunch', 'Corporate Lunch', 'غداء الشركات',
   'Individually portioned meals for offices and meetings.',
   'وجبات فردية مرتبة للمكاتب والاجتماعات.',
   array['Choice of two mains', 'Rice and bread', 'Salad', 'Dessert', 'Soft drinks'],
   array['طبقان رئيسيان حسب الاختيار', 'أرز وخبز', 'سلطة', 'حلوى', 'مشروبات غازية'],
   'Final price confirmed by the restaurant after review. Disposable packaging included.',
   'يؤكد المطعم السعر النهائي بعد المراجعة. تشمل العبوات أحادية الاستخدام.',
   0, 5500, 20, 150, 2),
  ('grand-celebration', 'Grand Celebration', 'احتفال كبير',
   'A full buffet with live grill for weddings and large events.',
   'بوفيه متكامل مع ركن مشاوي حي للأعراس والمناسبات الكبيرة.',
   array['Lamb ouzi', 'Live grill station', 'Mezze selection', 'Desserts table', 'Service staff'],
   array['قوزي لحم', 'ركن مشاوي حي', 'تشكيلة مقبلات', 'طاولة حلويات', 'طاقم خدمة'],
   'Final price confirmed by the restaurant after review. A deposit may be required.',
   'يؤكد المطعم السعر النهائي بعد المراجعة. قد يطلب دفع عربون.',
   500000, 9500, 50, 500, 3);
