const SRC = new URL('../src/', import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  const target = specifier.startsWith('@/') ? new URL(specifier.slice(2), SRC).href : specifier;
  try {
    return await nextResolve(target, context);
  } catch (galat) {
    if (galat.code !== 'ERR_MODULE_NOT_FOUND' && galat.code !== 'ERR_UNSUPPORTED_DIR_IMPORT')
      throw galat;
    for (const calon of [`${target}.ts`, `${target}/index.ts`]) {
      try {
        return await nextResolve(calon, context);
      } catch {
        // coba calon berikutnya
      }
    }
    throw galat;
  }
}
