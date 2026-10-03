# Rudra Nidhi store

A small shop for genuine Nepal Gauri Shankar rudraksha. Buyers pay by UPI straight to `aalok.pay@fam`. There's no payment gateway, so you check each payment by hand.

## Run it on your computer

```bash
npm install
npm start
```

Open http://localhost:3000. The admin page is at http://localhost:3000/kingalok. Its password is `ADMIN_PASSWORD` in the `.env` file.

## Before going live

1. **Photos:** put your bead photos in `public/images/gauri-shankar-ganesh/` and `public/images/gauri-shankar/`. Then list them in `images: [...]` in `src/config.js`. The first photo is the main one, and the Ganesh bead's first photo also appears at the top of the home page.
2. **Bead details:** in `src/config.js`, fill in `Size`, `Weight` and `Certificate` (lab report number). Anything left `null` stays hidden.
3. **Check the policies:** `shippingFee`, `shippingNote`, `dispatchDays` and `returnsPolicy` in `src/config.js`.
4. **WhatsApp (optional):** set `whatsapp` to show a chat button and a "See it on video call" button.

## Deploy on Vercel

1. In Vercel, click **Add New → Project** and import this GitHub repo. Leave the build settings as they are.
2. Before or after the first deploy, open the project → **Storage** → **Create Database** → **Upstash for Redis** (free plan) → connect it to this project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you. **Orders are not saved without it.**
3. Go to **Settings → Environment Variables** and add:
   - `ADMIN_PASSWORD`: your admin password
   - `SESSION_SECRET`: any long random text
4. Go to **Deployments** → the three dots on the latest one → **Redeploy**, so the new settings take effect.
5. Optional: go to **Settings → Domains** to add your own domain. Vercel shows you the DNS records to copy into your domain provider's site.

On your own computer the site stores orders in `data/orders.json` instead, so no database is needed there.

## Handling an order

1. Open /kingalok → **Check payment**. Orders where the buyer has entered a UTR appear here.
2. In FamPay, find a payment with that UTR and **the exact amount**.
3. In /kingalok → **Check payment**, press **Confirm payment received**. The buyer sees it on their order page (Track order).
4. After shipping, open **To ship**, enter the courier and tracking number, and press **Mark shipped**.
5. If no matching payment arrived, press **Cancel…** and give a reason. The bead goes back into stock.

Unpaid reservations end after 20 minutes on their own, and the bead goes back into stock.
