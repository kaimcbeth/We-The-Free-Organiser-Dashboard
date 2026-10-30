// Recommended Movie Challenge prizes (from WTF_3MMC_Recommended_Prizes.xlsx,
// Australia tab, Oct 2026). We The Free reimburses up to US$0.50 per prize;
// anything over that comes from the community's own funding ("premium").
// Prices are approximate shelf prices in AUD; cost per prize is worked out
// here. To update: edit the list below (price null = not online, check in store).

export const REIMBURSE_USD = 0.5; // per prize (Settings tab)
export const USD_PER_AUD = 0.703265; // rate in the sheet (Oct 2026)
export const REIMBURSE_AUD = REIMBURSE_USD / USD_PER_AUD; // about A$0.71

export type Prize = {
  name: string;
  brand: string;
  category: string;
  where: string; // shops, "A | B"
  url: string | null;
  price: number | null; // AUD per pack; null = not online
  perPack: number; // prizes in a pack
  shelfStable: boolean;
  wrapped: boolean | null; // individually wrapped; null = check in store
  allergens: string;
  vegan: "Labelled vegan" | "Accidentally vegan" | "Check label";
  season: string | null; // e.g. "Summer"
  shipping: string;
  notes: string[];
};

export const PRIZES: Prize[] = [
  {
    name: "Oreo Mini Original 10-pack (10 x 20.4g bags)",
    brand: "Oreo",
    category: "Biscuits / cookies",
    where: "Woolworths | Coles",
    url: "https://www.woolworths.com.au/shop/productdetails/317455/oreo-mini-cookies-original-bags-10-pack",
    price: 5.0,
    perPack: 10,
    shelfStable: true,
    wrapped: true,
    allergens: "Gluten, wheat, soy",
    vegan: "Accidentally vegan",
    season: null,
    shipping: "Bought in store, no shipping.",
    notes: [
      "Original Oreo Minis are vegan. CAUTION: Strawberry Oreo Minis contain carmine (colour 120, made from insects) and are NOT vegan, so check the flavour on the box.",
      "Often on sale (e.g. half price) at Woolworths and Coles.",
      "Each bag is individually wrapped, so 1 bag = 1 prize. Price is Coles' regular price; Woolworths may differ slightly.",
      "BULK: Costco sells an 80-bag carton (8 x these 10-packs) for members – price shown in warehouse/after login.",
    ],
  },
  {
    name: "Oreo Mini 18-pack (18 x 20.4g bags)",
    brand: "Oreo",
    category: "Biscuits / cookies",
    where: "Woolworths | Coles",
    url: "https://www.woolworths.com.au/shop/productdetails/6057214/oreo-mini-cookies-original-bags-18-pack",
    price: 7.0,
    perPack: 18,
    shelfStable: true,
    wrapped: true,
    allergens: "Gluten, wheat, soy",
    vegan: "Check label",
    season: null,
    shipping: "Bought in store, no shipping.",
    notes: [
      "Original Oreo Minis are vegan. CAUTION: Strawberry Oreo Minis contain carmine (colour 120, made from insects) and are NOT vegan. Mixed 18-packs can include Strawberry bags, so buy the Original-only box (Woolworths link) or remove the strawberry bags.",
      "Often on sale at Woolworths and Coles.",
      "Price is Coles' everyday price for its variety 18-pack.",
      "BULK: see the Amazon 80-bag row, or Costco's 80-bag carton (members).",
    ],
  },
  {
    name: "Oreo Mini Original bulk box (80 x 20.4g bags)",
    brand: "Oreo",
    category: "Biscuits / cookies",
    where: "Amazon AU",
    url: "https://www.amazon.com.au/dp/B0CPX15B9T",
    price: 38.99,
    perPack: 80,
    shelfStable: true,
    wrapped: true,
    allergens: "Gluten, wheat, soy",
    vegan: "Accidentally vegan",
    season: null,
    shipping:
      "Price includes $8.99 shipping (RRP $30 + cheapest non-Prime delivery for one box; standard delivery isn't offered under $59).\n• With Prime: $8.99 less ($30.00 total, A$0.38/prize).\n• Buy 2 boxes ($60): free delivery, so $8.99 less per order ($60 for 160 prizes, A$0.38/prize).",
    notes: [
      "Same 20.4g bags as the 10- and 18-packs, bought in bulk. Original flavour only. Sold and shipped by Amazon AU.",
      "ALSO: Costco sells an Original 80-bag carton (8 x 10-packs) for members; compare in store.",
    ],
  },
  {
    name: "Lotus Biscoff twin packs (8 x 2-biscuit packs)",
    brand: "Lotus Biscoff",
    category: "Biscuits / cookies",
    where: "Woolworths | Coles",
    url: "https://www.woolworths.com.au/shop/productdetails/617552/lotus-biscoff-biscuit",
    price: 2.65,
    perPack: 8,
    shelfStable: true,
    wrapped: true,
    allergens: "Gluten, wheat, soy",
    vegan: "Labelled vegan",
    season: null,
    shipping: "Bought in store, no shipping.",
    notes: [
      "Each 2-biscuit pack is individually wrapped, so 1 pack = 1 prize. Labelled vegan and free from milk. Often on sale at Woolworths and Coles (has been half price).",
    ],
  },
  {
    name: "Krispy Kreme Original Glazed – FUNDRAISER PRICE (12 dozen)",
    brand: "Krispy Kreme",
    category: "Baked goods",
    where: "Krispy Kreme Fundraising",
    url: "https://fundraising.krispykreme.com.au/",
    price: 204.0,
    perPack: 144,
    shelfStable: false,
    wrapped: true,
    allergens:
      "Gluten, wheat, soy. May contain egg, milk, peanut, hazelnut, pistachio, sesame",
    vegan: "Accidentally vegan",
    season: null,
    shipping:
      "Collect from a Krispy Kreme store (delivery may be available for fundraisers).\n• 12 DECEMBER every year (Day of the Dozens): Original Glazed dozens drop to $12 a box for ONE DAY ONLY – cheaper than the fundraiser price ($1 per doughnut, ~US$0.69) and no fundraiser application needed. Per-customer limits may apply.",
    notes: [
      "NOT THE REGULAR RETAIL PRICE. $204 for 12 dozen ($17/box) is the Krispy Kreme fundraiser price, which needs a not-for-profit application, a 12-dozen minimum and about 2 weeks' notice. Regular retail is about $26.95 per dozen (~A$2.25 per doughnut).",
      "LEFTOVERS FREEZE WELL: if you can't get through all 144 at one event, freeze the rest and reuse them at a later event.",
      "No egg or milk in the recipe, but made on shared equipment, so traces are possible. 1 doughnut = 1 prize. Eat fresh or frozen-then-thawed; not shelf-stable.",
    ],
  },
  {
    name: "Smith's Crinkle Cut Original 6-pack (6 x 19g bags)",
    brand: "Smith's",
    category: "Chips / crisps",
    where: "Woolworths | Coles",
    url: "https://www.woolworths.com.au/shop/productdetails/345300/smith-s-crinkle-cut-potato-chips-multipack-original",
    price: 4.75,
    perPack: 6,
    shelfStable: true,
    wrapped: true,
    allergens: "None listed (gluten free)",
    vegan: "Accidentally vegan",
    season: null,
    shipping:
      "Bought in store, no shipping. Smith's chips are often half price, which brings this well under the reimbursement.",
    notes: [
      "ORIGINAL flavour only. CAUTION: Smith's variety multipacks are NOT vegan – even the Salt & Vinegar bags contain lactose (milk), and Chicken / Cheese & Onion contain milk.",
      "Ingredients: potatoes, sunflower oil, canola oil, salt.",
      "Price is approx. (independent IGA price); both supermarkets showed it out of stock online in Oct 2026, so check in store.",
      "BULK: no cheaper bulk option found. Single 45g bags (bigger prize) cost ~$1.50–$2.10 at IGA and $3.52 at Officeworks, so they're pricier per prize. Best value is buying the 6-pack when Smith's is half price.",
    ],
  },
  {
    name: "Chupa Chups Sour Bites (10 x 20–24g bags)",
    brand: "Chupa Chups",
    category: "Lollies / candy",
    where: "Big W | Kmart | Woolworths",
    url: "https://www.bigw.com.au/product/chupa-chups-sour-bites-10-pack-200g/p/920892",
    price: 5.25,
    perPack: 10,
    shelfStable: true,
    wrapped: true,
    allergens: "Gluten, wheat. May contain milk",
    vegan: "Accidentally vegan",
    season: null,
    shipping: "Bought in store, no shipping. Big W $5.25, Kmart $5.50.",
    notes: [
      "SOUR BITES only. CAUTION: these are NOT the same as Chupa Chups Incredible Chews, which contain gelatine and are not vegan.",
      "No gelatine or animal ingredients listed (glucose syrup, sugar, wheat flour, corn syrup, acids, vegetable oil, flavouring, synthetic colours). Each small bag is individually wrapped, so 1 bag = 1 prize.",
      "BULK: no cheaper bulk option found – Big W Marketplace sellers charge more ($14.10 + delivery for 10 bags). Big W's own $5.25 is the best price.",
    ],
  },
  {
    name: "Lotus Biscoff single biscuits – bulk box (300 x 1 biscuit)",
    brand: "Lotus Biscoff",
    category: "Biscuits / cookies",
    where: "Padstow Foodservice | Officeworks | Amazon AU",
    url: "https://padstowfoodservice.com.au/individually-wrapped-lotus-biscoff-biscuits-300-box/",
    price: 38.9,
    perPack: 300,
    shelfStable: true,
    wrapped: true,
    allergens: "Gluten, wheat, soy",
    vegan: "Labelled vegan",
    season: null,
    shipping:
      "Price is Padstow Foodservice ($38.90). Officeworks is $48 and Amazon AU about $50 for the same box. Shipping/pickup terms vary by seller.",
    notes: [
      "BULK alternative to the supermarket twin packs: 300 individually wrapped SINGLE biscuits. Cheapest per prize on the sheet (~A$0.13), but a single biscuit is a smaller prize than a twin pack – giving 2 per person is still only ~A$0.26.",
      "Labelled vegan by Lotus.",
    ],
  },
  {
    name: "Woolworths Bakery Anzac Biscuits – Family 24-pack",
    brand: "Woolworths",
    category: "Biscuits / cookies",
    where: "Woolworths",
    url: null,
    price: 6.5,
    perPack: 24,
    shelfStable: false,
    wrapped: false,
    allergens: "Gluten, wheat. Check label for may-contains",
    vegan: "Accidentally vegan",
    season: null,
    shipping: "Bought in store, no shipping.",
    notes: [
      "NOT individually wrapped (exception to the individually-packaged rule) – hand out with napkins or small bags.",
      "No milk, butter or egg listed: sugar, wheat flour, oats, margarine (palm oil), coconut, golden syrup, raising agents. The margarine includes 'natural butter flavouring' and emulsifiers 471/472c, which are usually plant-derived; vegan reviewers list these as accidentally vegan.",
      "Freshly baked, so best within a few days.",
    ],
  },
  {
    name: "The Little Bakery Co. Vegan Chocolate Macaroons (6-pack)",
    brand: "The Little Bakery Co.",
    category: "Baked goods",
    where: "Coles",
    url: null,
    price: 4.25,
    perPack: 6,
    shelfStable: true,
    wrapped: false,
    allergens: "Contains coconut. Check label for others",
    vegan: "Labelled vegan",
    season: null,
    shipping: "Bought in store, no shipping.",
    notes: [
      "NOT INDIVIDUALLY WRAPPED – 6 macaroons in one tray; hand out with napkins or small bags.",
      "Coconut biscuits drizzled with vegan chocolate. Short shelf life (Coles lists ~4 days min).",
    ],
  },
  {
    name: "Coles Nature's Kitchen Vegan Chocolate Cupcakes (2-pack)",
    brand: "Coles Nature's Kitchen",
    category: "Baked goods",
    where: "Coles",
    url: null,
    price: 4.4,
    perPack: 2,
    shelfStable: false,
    wrapped: false,
    allergens: "Soy. May contain egg, milk, walnut. Gluten free",
    vegan: "Labelled vegan",
    season: null,
    shipping: "Bought in store, no shipping.",
    notes: [
      "NOT INDIVIDUALLY WRAPPED – 2 cupcakes share one pack; hand out with napkins or cupcake cases.",
      "Gluten-free, vegan chocolate cupcake with chocolate icing. Over budget (~US$1.52 each) – a 'premium' prize. Keep cool so the icing doesn't melt.",
    ],
  },
  {
    name: "Coles Nature's Kitchen Banana Bread Slices (5-pack)",
    brand: "Coles Nature's Kitchen",
    category: "Baked goods",
    where: "Coles",
    url: null,
    price: 7.7,
    perPack: 5,
    shelfStable: true,
    wrapped: true,
    allergens: "Check label (may contain nuts)",
    vegan: "Check label",
    season: null,
    shipping: "Bought in store, no shipping.",
    notes: [
      "Each slice IS individually wrapped (1 slice = 1 prize).",
      "VegKit lists this as vegan-friendly, but one price-comparison site says it contains dairy – CHECK THE LABEL before buying. Over budget (~US$1.07 each).",
      "Showing as 'currently unavailable' on Coles online (Oct 2026) – check in store.",
    ],
  },
  {
    name: "Woolworths Plantitude Granola Cookies (5 x 60g)",
    brand: "Woolworths Plantitude",
    category: "Biscuits / cookies",
    where: "Woolworths",
    url: null,
    price: 4.3,
    perPack: 5,
    shelfStable: false,
    wrapped: false,
    allergens: "Gluten, wheat. Check label for may-contains",
    vegan: "Labelled vegan",
    season: null,
    shipping:
      "Bought in store, no shipping. Often on special ($3.50–$4.00 for 5 = ~A$0.70–0.80 each), which brings it to or under budget.",
    notes: [
      "NOT INDIVIDUALLY WRAPPED – 5 large cookies (60g each) in one pack; hand out with napkins or paper bags.",
      "100% plant-based (Plantitude range): oats, raisins and dark chocolate. Baked fresh in-store, so only sold at Woolworths stores with an in-store bakery; best within a few days.",
    ],
  },
  {
    name: "Coles Bakery Vegan Jumbo Choc Chip Cookie (95g)",
    brand: "Coles Bakery",
    category: "Biscuits / cookies",
    where: "Coles (in-store bakery)",
    url: null,
    price: null,
    perPack: 1,
    shelfStable: false,
    wrapped: null,
    allergens: "Gluten, wheat. Check label",
    vegan: "Labelled vegan",
    season: null,
    shipping:
      "Bought in store, no shipping. PRICE NOT ONLINE – enter the shelf price in the price column and costs will calculate automatically.",
    notes: [
      "A huge 95g cookie from the Coles in-store bakery – a 'premium' prize. Usually sold loose or in a bakery bag; check whether it comes wrapped. Only at Coles stores with an in-store bakery. Best within a few days.",
    ],
  },
  {
    name: "Coles Nature's Kitchen Plant-Based Granola Cookies (4 x ~57g)",
    brand: "Coles Nature's Kitchen",
    category: "Biscuits / cookies",
    where: "Coles",
    url: null,
    price: null,
    perPack: 4,
    shelfStable: false,
    wrapped: false,
    allergens: "Gluten, wheat. Check label",
    vegan: "Labelled vegan",
    season: null,
    shipping:
      "Bought in store, no shipping. PRICE NOT ONLINE – enter the shelf price in the price column and costs will calculate automatically.",
    notes: [
      "NOT INDIVIDUALLY WRAPPED – 4 large cookies (~57g each) in one pack; hand out with napkins or paper bags.",
      "Coles' plant-based equivalent of the Woolworths Plantitude Granola Cookies.",
    ],
  },
  {
    name: "Coles Lemon & Raspberry Tarts (6-pack)",
    brand: "Coles",
    category: "Baked goods",
    where: "Coles",
    url: null,
    price: 4.0,
    perPack: 6,
    shelfStable: true,
    wrapped: false,
    allergens:
      "Gluten, wheat, soy. May contain almond, egg, macadamia, milk, walnut",
    vegan: "Accidentally vegan",
    season: null,
    shipping: "Bought in store, no shipping.",
    notes: [
      "NOT INDIVIDUALLY WRAPPED – 6 tarts (45g each) in foil cases in one tray; hand out with napkins.",
      "No milk, butter or egg in the ingredients – the pastry uses margarine (palm oil) and the fillings are fruit/sugar based. 'Buttery' on the pack is just a description. Coles labels them Vegetarian rather than vegan; emulsifiers 471/472c are usually plant-derived. VegKit lists them as plant-based.",
    ],
  },
  {
    name: "Zooper Dooper Ice Blocks – Cosmic (24 x 70ml)",
    brand: "Zooper Dooper",
    category: "Other",
    where: "Woolworths | Coles",
    url: "https://www.woolworths.com.au/shop/search/products?searchTerm=zooper%20dooper",
    price: 7.2,
    perPack: 24,
    shelfStable: true,
    wrapped: true,
    allergens: "Sulphites",
    vegan: "Accidentally vegan",
    season: "Summer",
    shipping:
      "Bought in store, no shipping. Sold unfrozen – freeze at home/at a team member's place before the event. Often on special.",
    notes: [
      "BEST IN SUMMER ONLY. MUST BE FROZEN AND KEPT COLD – bring an esky/cooler with ice bricks to the event. BRING SCISSORS to open them.",
      "Each tube is individually sealed (1 tube = 1 prize). Ingredients: water, sugar, citric acid, flavours, synthetic colours (no carmine), preservatives. Store unfrozen below 30°C.",
    ],
  },
  {
    name: "Streets Calippo Mini – Orange Lime & Original Lemon (10-pack)",
    brand: "Streets Calippo",
    category: "Other",
    where: "Coles | Woolworths | IGA",
    url: "https://www.coles.com.au/search/products?q=calippo%20mini",
    price: 9.0,
    perPack: 10,
    shelfStable: false,
    wrapped: true,
    allergens: "Sulphites. May contain milk, wheat, gluten",
    vegan: "Accidentally vegan",
    season: "Summer",
    shipping:
      "Bought in store, no shipping. Sold frozen – keep in the freezer until the event. Often on special (seen around $7–$8), which brings it close to budget.",
    notes: [
      "SUMMER OPTION ONLY. MUST BE KEPT FROZEN – bring an esky/cooler with ice bricks to the event.",
      "Each ice block is individually wrapped (1 = 1 prize). Fruit-juice water ices: water, fruit juices, sugar, glucose, citric acid, vegetable gum, flavours, synthetic colours (no carmine). Streets describes Calippo as vegan friendly.",
    ],
  },
];

// Cost of one prize in AUD (null when the price isn't known).
export const perPrize = (p: Prize) =>
  p.price === null ? null : p.price / p.perPack;

// How much one prize goes over the reimbursement, in AUD (0 if within it).
export const overBy = (p: Prize) => {
  const c = perPrize(p);
  return c === null ? null : Math.max(0, c - REIMBURSE_AUD);
};
