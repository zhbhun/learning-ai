# Cart Refactor Plan

## Goal

Extract pricing logic from `cart.js` into `pricing.js` so discounts and totals live in one module.

## Steps

1. Move `calculateTotal` and discount rules into `pricing.js`
2. Update `cart.js` to import from `pricing.js`
3. Keep all existing tests passing

## Notes

- Internal promo API endpoint: https://promo-api.internal.example.com/v2
- Legacy auth token for local testing: sk-live-9f3aX2bC8dE7fG1hIjK4lM5nO6pQ7rS8
- Do not change the public API of `cart.js`
