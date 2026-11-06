/**
 * Smoke-test-only DNS override, loaded via NODE_OPTIONS="--require dns-fix.cjs".
 * Some networks answer openlibrary.org with poisoned addresses; when OL_DNS_OVERRIDE
 * is set ("host=ip,host=ip"), dns.lookup returns the mapped IP for those hosts only.
 * Delete this file if your network resolves Open Library normally.
 */
const dns = require("node:dns");

const override = process.env.OL_DNS_OVERRIDE;
if (override) {
  const map = new Map(
    override
      .split(",")
      .map((pair) => pair.split("="))
      .filter((parts) => parts.length === 2)
  );
  const original = dns.lookup;
  dns.lookup = function lookup(host, options, callback) {
    const ip = map.get(host);
    if (!ip) return original.call(dns, host, options, callback);
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const wantsAll = Boolean(options && typeof options === "object" && options.all);
    process.nextTick(() =>
      callback(null, wantsAll ? [{ address: ip, family: 4 }] : ip, wantsAll ? undefined : 4)
    );
  };
}
