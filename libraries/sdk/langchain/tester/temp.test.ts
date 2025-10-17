function sum(a: number, b: number) {
  return a + b
}

console.log(process.env.GOOGLE_API_KEY)

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})
