const lancedb = require("vectordb");

(async () => {
  const db = await lancedb.connect("data/sample-lancedb");

  const table = await db.createTable({
    name: "vectors",
    data: [
      { id: 1, vector: [0.1, 0.2], item: "foo", price: 10 },
      { id: 2, vector: [1.1, 1.2], item: "bar", price: 50 },
    ],
  });

  const query = table.search([1.1, 1.3]).limit(2);
  const results = await query.execute();
  console.log(results);

  // You can also search for rows by specific criteria without involving a vector search.
  const rowsByCriteria = await table
    .search(undefined)
    .where("price >= 50")
    .execute();

  console.log(rowsByCriteria);
})();
