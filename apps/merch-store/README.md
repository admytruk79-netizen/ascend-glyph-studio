# ASCEND Objects — Merchandise Web App

Standalone customer-facing merchandise experience. Shopify is the commerce backend; ASCEND owns the visual and symbolic experience.

## Architecture
ASCEND Objects UI → Shopify Storefront API → Shopify Cart/Checkout → Shopify order/fulfillment.

The app is intentionally separate from the Glyph Studio while living in the same monorepo so it can later consume canonical glyph assets and manifests without duplicating them.

## Run
```bash
npm install
npm run dev -w @ascend/merch-store
```
Copy `.env.example` to `.env` and add the Storefront API public access token. The connected shop domain is already set to `8fcic1-nv.myshopify.com`.

Without a token, the app renders the full branded shell with preview product cards and reports that Shopify is ready to connect. With the token, product cards load from Shopify and Buy creates a Shopify cart and redirects to Shopify Checkout.

## Design direction
- 108 Keys become a symbolic language, not generic motifs.
- Five families: Earth, Water, Fire, Air, Spirit.
- Repetition, mirroring and border grammar reference Ukrainian embroidery structure while preserving ASCEND's own glyph vocabulary.
- Dark, restrained ASCEND visual system with linen/paper contrast and warm metallic accents.
- Merchandise is presented as designed objects rather than a generic ecommerce grid.
