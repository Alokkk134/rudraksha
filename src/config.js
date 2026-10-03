// Everything about the shop that you might want to change lives in this file.
// Edit, save, and restart the server.

const site = {
  brand: 'Rudra Nidhi',
  brandHindi: 'रुद्र निधि',
  tagline: 'Genuine Nepal Gauri Shankar rudraksha, sold one bead at a time.',

  // UPI payment details. Buyers pay this ID directly.
  upiId: 'aalok.pay@fam',
  // Name sent in the UPI link. The buyer's app shows the name registered
  // with your UPI ID, so keep this the same as that name.
  payeeName: 'Aalok',

  // The only contact shown on the site. Leave empty to hide all contact buttons.
  // Format: country code + number, digits only, e.g. '919876543210'
  whatsapp: '',

  // How long a bead stays reserved for a buyer who has not paid yet
  reservationMinutes: 20,

  // Shipping. CONFIRM these before going live.
  shippingFee: 0,
  shippingNote: 'Free shipping across India',
  dispatchDays: '1–2 working days',

  // Returns policy shown in the FAQ. CONFIRM before going live.
  returnsPolicy:
    'If the bead you receive does not match the photos on this site, tell us within 48 hours of delivery with an unboxing video and we will arrange a return and full refund.',
};

const products = [
  {
    slug: 'gauri-shankar-ganesh',
    name: 'Gauri Shankar Ganesh Rudraksha',
    nameHindi: 'गौरी शंकर गणेश',
    shortName: 'Gauri Shankar Ganesh',
    price: 7700,
    stock: 1,
    badge: 'Rare', // shows as "Only piece" while stock is 1
    summary: 'Two rudraksha joined together, with a small third bead on top. It is very hard to find.',
    description: [
      'The two big beads are Shiva and Parvati. The small one on top is Ganesha. A whole family in one bead.',
    ],
    // Shown under "Benefits (as per tradition)"
    benefits: [
      'Peace and unity in the family',
      'Love and understanding between husband and wife',
      'Ganesha’s blessing for new starts and removing obstacles',
    ],
    // Shown under "Why buy from us"
    whyUs: [
      'You get the bead shown in the photo',
      'Natural from Nepal, not glued',
      'Lab certificate comes with it',
    ],
    // Fill these in to show them on the site. Anything left null is hidden.
    specs: {
      Origin: 'Nepal',
      Formation: 'Natural, three joined beads',
      Size: null, // e.g. '28 × 22 mm'
      Weight: null, // e.g. '9.4 g'
      Certificate: null, // e.g. 'Lab report no. 12345'
    },
    // Photo paths. The first one is the main photo (also used at the top of the home page).
    images: ['/images/gauri-shankar-ganesh/1.jpg'],
  },
  {
    slug: 'gauri-shankar',
    name: 'Gauri Shankar Rudraksha',
    nameHindi: 'गौरी शंकर',
    shortName: 'Gauri Shankar',
    price: 1100,
    stock: 9,
    badge: 'Limited',
    summary: 'Two rudraksha that grew joined on the tree. The bead of Shiva and Parvati.',
    description: [
      'Each bead is shaped by nature, so yours will look very close to the photo but not exactly the same.',
    ],
    benefits: [
      'Love and trust between husband and wife',
      'Harmony at home',
      'Often worn by those wishing for a good marriage',
    ],
    whyUs: [
      'Natural from Nepal, not glued',
      'Lab certificate with every bead',
      // {stock} and {left} are filled in with the live numbers
      'Only {stock} pieces in total',
    ],
    specs: {
      Origin: 'Nepal',
      Formation: 'Natural, two joined beads',
      Size: null,
      Weight: null,
      Certificate: null,
    },
    images: ['/images/gauri-shankar/1.jpg'],
  },
];

module.exports = { site, products };
