/**
 * PLACEHOLDER catalog, identical to supabase/seed.sql (same slugs and
 * prices), used to render the public pages until they read from the
 * database. Replace with the owner's approved bilingual menu.
 * Prices are AED fils (1 AED = 100 fils).
 */
import type { Locale } from "@/i18n/config";

export type Category = { id: string; nameEn: string; nameAr: string };

export type MenuItem = {
  id: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priceFils: number;
  isActive: boolean;
  isAvailable: boolean;
  isSignature?: boolean;
};

export type CateringPackage = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  includedEn: string[];
  includedAr: string[];
  termsEn: string;
  termsAr: string;
  basePriceFils: number;
  pricePerGuestFils: number | null;
  minimumGuests: number;
  maximumGuests: number | null;
};

export const categories: Category[] = [
  { id: "breakfast", nameEn: "Breakfast", nameAr: "الفطور" },
  { id: "mains", nameEn: "Main dishes", nameAr: "الأطباق الرئيسية" },
  { id: "grills", nameEn: "Grills", nameAr: "المشويات" },
  { id: "desserts", nameEn: "Desserts & drinks", nameAr: "الحلويات والمشروبات" },
];

export const menuItems: MenuItem[] = [
  { id: "balaleet", categoryId: "breakfast", nameEn: "Balaleet", nameAr: "بلاليط", descriptionEn: "Sweet saffron vermicelli topped with a thin omelette.", descriptionAr: "شعيرية حلوة بالزعفران تعلوها طبقة رقيقة من البيض.", priceFils: 2800, isActive: true, isAvailable: true },
  { id: "chebab", categoryId: "breakfast", nameEn: "Chebab pancakes", nameAr: "خبز الجباب", descriptionEn: "Emirati cardamom pancakes served with date syrup and cheese.", descriptionAr: "فطائر إماراتية بالهيل تقدم مع دبس التمر والجبن.", priceFils: 2600, isActive: true, isAvailable: true },
  { id: "shakshuka", categoryId: "breakfast", nameEn: "Shakshuka", nameAr: "شكشوكة", descriptionEn: "Eggs poached in a spiced tomato and pepper sauce.", descriptionAr: "بيض مطهو في صلصة الطماطم والفلفل المتبلة.", priceFils: 2400, isActive: true, isAvailable: true },
  { id: "chicken-machboos", categoryId: "mains", nameEn: "Chicken machboos", nameAr: "مجبوس دجاج", descriptionEn: "Spiced rice with slow-cooked chicken, loomi and fried onions.", descriptionAr: "أرز متبل مع دجاج مطهو ببطء ولومي وبصل مقرمش.", priceFils: 4200, isActive: true, isAvailable: true, isSignature: true },
  { id: "lamb-ouzi", categoryId: "mains", nameEn: "Lamb ouzi", nameAr: "قوزي لحم", descriptionEn: "Tender lamb over fragrant rice with nuts and raisins.", descriptionAr: "لحم ضأن طري على أرز عطري مع المكسرات والزبيب.", priceFils: 6500, isActive: true, isAvailable: true, isSignature: true },
  { id: "harees", categoryId: "mains", nameEn: "Harees", nameAr: "هريس", descriptionEn: "Slow-cooked wheat and meat, a traditional Emirati favourite.", descriptionAr: "قمح ولحم مطهوان ببطء، طبق إماراتي تقليدي محبوب.", priceFils: 3500, isActive: true, isAvailable: true },
  { id: "mixed-grill", categoryId: "grills", nameEn: "Mixed grill platter", nameAr: "طبق مشاوي مشكلة", descriptionEn: "Shish tawook, kebab and lamb chops with grilled vegetables.", descriptionAr: "شيش طاووق وكباب وريش ضأن مع خضار مشوية.", priceFils: 7800, isActive: true, isAvailable: true },
  { id: "shish-tawook", categoryId: "grills", nameEn: "Shish tawook", nameAr: "شيش طاووق", descriptionEn: "Marinated chicken skewers with garlic sauce and bread.", descriptionAr: "أسياخ دجاج متبلة مع صلصة الثوم والخبز.", priceFils: 3800, isActive: true, isAvailable: true },
  { id: "grilled-hammour", categoryId: "grills", nameEn: "Grilled hammour", nameAr: "هامور مشوي", descriptionEn: "Fresh Gulf hammour with lemon, herbs and rice.", descriptionAr: "هامور خليجي طازج مع الليمون والأعشاب والأرز.", priceFils: 6900, isActive: true, isAvailable: true, isSignature: true },
  { id: "luqaimat", categoryId: "desserts", nameEn: "Luqaimat", nameAr: "لقيمات", descriptionEn: "Crispy sweet dumplings drizzled with date syrup.", descriptionAr: "كرات عجين مقرمشة محلاة بدبس التمر.", priceFils: 1800, isActive: true, isAvailable: true, isSignature: true },
  { id: "umm-ali", categoryId: "desserts", nameEn: "Umm Ali", nameAr: "أم علي", descriptionEn: "Warm bread pudding with milk, nuts and coconut.", descriptionAr: "حلوى دافئة من الخبز والحليب والمكسرات وجوز الهند.", priceFils: 2200, isActive: true, isAvailable: true },
  { id: "karak-tea", categoryId: "desserts", nameEn: "Karak tea", nameAr: "شاي كرك", descriptionEn: "Strong spiced tea with milk and cardamom.", descriptionAr: "شاي قوي متبل بالحليب والهيل.", priceFils: 600, isActive: true, isAvailable: true },
];

export const cateringPackages: CateringPackage[] = [
  {
    id: "family-gathering",
    nameEn: "Family gathering",
    nameAr: "تجمع عائلي",
    descriptionEn: "A generous home-style spread for family occasions.",
    descriptionAr: "مائدة سخية على الطريقة المنزلية للمناسبات العائلية.",
    includedEn: ["Chicken machboos", "Salads and mezze", "Luqaimat", "Karak tea"],
    includedAr: ["مجبوس دجاج", "سلطات ومقبلات", "لقيمات", "شاي كرك"],
    termsEn: "Final price confirmed by the restaurant after review. Delivery within Ajman.",
    termsAr: "يؤكد المطعم السعر النهائي بعد المراجعة. التوصيل داخل عجمان.",
    basePriceFils: 150000,
    pricePerGuestFils: 4500,
    minimumGuests: 15,
    maximumGuests: 40,
  },
  {
    id: "corporate-lunch",
    nameEn: "Corporate lunch",
    nameAr: "غداء الشركات",
    descriptionEn: "Individually portioned meals for offices and meetings.",
    descriptionAr: "وجبات فردية مرتبة للمكاتب والاجتماعات.",
    includedEn: ["Choice of two mains", "Rice and bread", "Salad", "Dessert", "Soft drinks"],
    includedAr: ["طبقان رئيسيان حسب الاختيار", "أرز وخبز", "سلطة", "حلوى", "مشروبات غازية"],
    termsEn: "Final price confirmed by the restaurant after review. Disposable packaging included.",
    termsAr: "يؤكد المطعم السعر النهائي بعد المراجعة. تشمل العبوات أحادية الاستخدام.",
    basePriceFils: 0,
    pricePerGuestFils: 5500,
    minimumGuests: 20,
    maximumGuests: 150,
  },
  {
    id: "grand-celebration",
    nameEn: "Grand celebration",
    nameAr: "احتفال كبير",
    descriptionEn: "A full buffet with live grill for weddings and large events.",
    descriptionAr: "بوفيه متكامل مع ركن مشاوي حي للأعراس والمناسبات الكبيرة.",
    includedEn: ["Lamb ouzi", "Live grill station", "Mezze selection", "Desserts table", "Service staff"],
    includedAr: ["قوزي لحم", "ركن مشاوي حي", "تشكيلة مقبلات", "طاولة حلويات", "طاقم خدمة"],
    termsEn: "Final price confirmed by the restaurant after review. A deposit may be required.",
    termsAr: "يؤكد المطعم السعر النهائي بعد المراجعة. قد يطلب دفع عربون.",
    basePriceFils: 500000,
    pricePerGuestFils: 9500,
    minimumGuests: 50,
    maximumGuests: 500,
  },
];

export function localized<T extends Record<string, unknown>>(row: T, field: string, locale: Locale): string {
  const key = `${field}${locale === "ar" ? "Ar" : "En"}`;
  return String(row[key] ?? "");
}

/** "From AED x" estimate for a package at its minimum size (final price is always confirmed by staff). */
export function packageStartingFils(pkg: CateringPackage): number {
  return pkg.basePriceFils + (pkg.pricePerGuestFils ?? 0) * pkg.minimumGuests;
}
