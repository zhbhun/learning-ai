function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  if (items.some((item) => item.price > 100)) {
    total *= 0.9;
  }
  return total;
}

function addToCart(cart, item) {
  const existing = cart.find((entry) => entry.name === item.name);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push({ ...item });
  }
  return cart;
}

module.exports = { calculateTotal, addToCart };
