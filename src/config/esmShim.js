const Module = require('module');

// sanitize-html requires htmlparser2 synchronously, but htmlparser2 ships as
// ESM-only (no CJS export condition). require() of an ESM module only works
// on Node runtimes that support require(esm) (stable on Node 22.12+) — some
// serverless Node builds don't, which surfaces as ERR_REQUIRE_ESM.
//
// dynamic import() always works from CJS regardless of Node version, so we
// preload the ESM-only deps that way and seed the result into require's
// module cache under their resolved path. sanitize-html's own require() call
// then finds them already cached instead of hitting the ESM/CJS boundary.
const ESM_ONLY_CJS_DEPS = ['htmlparser2'];

let primed = null;

async function primeEsmOnlyCjsDeps() {
  if (!primed) {
    primed = Promise.all(
      ESM_ONLY_CJS_DEPS.map(async (specifier) => {
        const resolved = require.resolve(specifier);
        if (require.cache[resolved]) return;
        const esmModule = await import(specifier);
        const mod = new Module(resolved, module);
        mod.filename = resolved;
        mod.loaded = true;
        mod.exports = esmModule;
        require.cache[resolved] = mod;
      })
    );
  }
  await primed;
}

module.exports = { primeEsmOnlyCjsDeps };
