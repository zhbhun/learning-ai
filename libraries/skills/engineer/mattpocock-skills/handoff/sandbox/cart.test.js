const { calculateTotal, addToCart } = require("./cart");

test("empty cart totals zero", () => {
  expect(calculateTotal([])).toBe(0);
});

test("sums items", () => {
  const cart = addToCart([], { name: "apple", price: 2, quantity: 3 });
  expect(calculateTotal(cart)).toBe(6);
});

test("applies 10% discount when any item over 100", () => {
  const cart = addToCart([], { name: "keyboard", price: 150, quantity: 1 });
  expect(calculateTotal(cart)).toBe(135);
});

test("discount threshold uses price not total", () => {
  const cart = addToCart([], { name: "pen", price: 5, quantity: 30 });
  expect(calculateTotal(cart)).toBe(150);
});

test("price exactly 100 gets no discount", () => {
  const cart = addToCart([], { name: "desk", price: 100, quantity: 3 });
  expect(calculateTotal(cart)).toBe(300);
});
