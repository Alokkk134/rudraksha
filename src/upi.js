const QRCode = require('qrcode');
const { site } = require('./config');

// Standard UPI payment URI. Every UPI app understands this format.
// No `tr` (merchant ref) — personal UPI IDs can reject payments that carry one.
// Some UPI apps choke on '%40' and '+', so keep '@' literal and encode spaces as %20.
function upiParams(order) {
  const params = {
    pa: site.upiId,
    pn: site.payeeName,
    am: order.total.toFixed(2),
    cu: 'INR',
    tn: `Order ${order.id}`,
  };
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%40/g, '@')}`)
    .join('&');
}

function upiLink(order) {
  return 'upi://pay?' + upiParams(order);
}

// App-specific links open one app directly instead of the chooser.
function appLinks(order) {
  const q = upiParams(order);
  return {
    any: 'upi://pay?' + q,
    gpay: 'tez://upi/pay?' + q,
    phonepe: 'phonepe://pay?' + q,
    paytm: 'paytmmp://pay?' + q,
  };
}

function qrSvg(order) {
  return QRCode.toString(upiLink(order), {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#2a160c', light: '#ffffff' },
  });
}

function qrPng(order) {
  return QRCode.toBuffer(upiLink(order), { type: 'png', width: 720, margin: 2 });
}

module.exports = { upiLink, appLinks, qrSvg, qrPng };
