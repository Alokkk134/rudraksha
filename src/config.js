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
    badge: 'Only piece',
    summary:
      'Two rudraksha beads joined by nature, with a third small bead growing from them. One of the rarest forms a rudraksha takes.',
    description: [
      'A Gauri Shankar Ganesh forms when two beads grow fused together on the tree and a third, smaller bead — the Ganesh — forms on them. Such beads appear only rarely in a harvest.',
      'In tradition the three beads stand for Shiva, Parvati and their son Ganesha, together as one family. It is kept in the puja room or worn for harmony and unity in the home.',
      'This is the only piece we have. It is the exact bead in the photos.',
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
    images: ['/images/gauri-shankar-ganesh/1.png'],
  },
  {
    slug: 'gauri-shankar',
    name: 'Gauri Shankar Rudraksha',
    nameHindi: 'गौरी शंकर',
    shortName: 'Gauri Shankar',
    price: 1100,
    stock: 9,
    badge: 'Limited',
    summary:
      'Two rudraksha beads grown naturally joined as one. Traditionally the bead of Shiva and Parvati.',
    description: [
      'A Gauri Shankar is two rudraksha beads that grew fused together on the tree. Joined beads like these are uncommon, which is why they are prized.',
      'In tradition it stands for the union of Shiva and Parvati. It is worn or kept in the puja room for harmony between partners and within the family.',
      'We have nine of these beads, all from Nepal. Nature shapes each one a little differently, so the bead you receive will be very close to, but not identical with, the one in the photos.',
    ],
    specs: {
      Origin: 'Nepal',
      Formation: 'Natural, two joined beads',
      Size: null,
      Weight: null,
      Certificate: null,
    },
    images: [],
  },
];

module.exports = { site, products };
