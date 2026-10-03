# Rudra Nidhi store

A small shop for genuine Nepal Gauri Shankar rudraksha. Buyers pay by UPI straight to `aalok.pay@fam`. There's no payment gateway, so you check each payment by hand.

## Run it on your computer

```bash
npm install
npm start
```

Open http://localhost:3000. The admin page is at http://localhost:3000/admin. Its password is `ADMIN_PASSWORD` in the `.env` file.

## Before going live

1. **Photos:** put your bead photos in `public/images/gauri-shankar-ganesh/` and `public/images/gauri-shankar/`. Then list them in `images: [...]` in `src/config.js`. The first photo is the main one, and the Ganesh bead's first photo also appears at the top of the home page.
2. **Bead details:** in `src/config.js`, fill in `Size`, `Weight` and `Certificate` (lab report number). Anything left `null` stays hidden.
3. **Check the policies:** `shippingFee`, `shippingNote`, `dispatchDays` and `returnsPolicy` in `src/config.js`.
4. **WhatsApp (optional):** set `whatsapp` to show a chat button and a "See it on video call" button.
5. **Hosting:** set `SITE_URL` to your real domain. Keep `DATA_DIR` on a disk that survives restarts, because all orders are stored there.

## Handling an order

1. Open /admin → **Check payment**. Orders where the buyer has entered a UTR appear here.
2. In FamPay, find a payment with that UTR and **the exact amount**.
3. In /admin → **Check payment**, press **Confirm payment received**. The buyer sees it on their order page (Track order).
4. After shipping, open **To ship**, enter the courier and tracking number, and press **Mark shipped**.
5. If no matching payment arrived, press **Cancel…** and give a reason. The bead goes back into stock.

Unpaid reservations end after 20 minutes on their own, and the bead goes back into stock.
