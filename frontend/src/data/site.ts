export type MenuItem = {
  name: string;
  description: string;
  price: string;
  badge: string;
};

export type CateringPackage = {
  name: string;
  description: string;
  startingPrice: string;
  guests: string;
};

export const menuItems: MenuItem[] = [
  {
    name: "Lemon Herb Chicken",
    description: "Grilled chicken with fresh herbs, saffron rice, and seasonal vegetables.",
    price: "AED 38",
    badge: "Popular",
  },
  {
    name: "Umodai Mixed Grill",
    description: "A family-style platter with grilled meats, sauces, and warm breads.",
    price: "AED 72",
    badge: "Chef's pick",
  },
  {
    name: "Falafel Wrap",
    description: "Crispy falafel, pickles, salad, and house-made tahini in a soft wrap.",
    price: "AED 24",
    badge: "Vegetarian",
  },
  {
    name: "Seafood Rice Bowl",
    description: "Charred seafood, citrus rice, vegetables, and garlic herb dressing.",
    price: "AED 46",
    badge: "Fresh",
  },
];

export const cateringPackages: CateringPackage[] = [
  {
    name: "Office Lunch Box",
    description: "Balanced lunch selections for teams, with hot mains, salads, and drinks.",
    startingPrice: "AED 220",
    guests: "10-25 guests",
  },
  {
    name: "Family Gathering",
    description: "Popular buffet setup ideal for family events and private dinners.",
    startingPrice: "AED 480",
    guests: "20-50 guests",
  },
  {
    name: "Luxury Event Buffet",
    description: "Premium dining experience with curated menus, presentation, and service support.",
    startingPrice: "AED 900",
    guests: "50+ guests",
  },
];

export const quickStats = [
  { label: "Arabic + English", value: "Bilingual" },
  { label: "Service area", value: "Ajman" },
  { label: "Order flow", value: "Online" },
  { label: "Catering review", value: "Human-approved" },
];
