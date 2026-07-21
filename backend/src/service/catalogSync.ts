import { ExternalSource } from "@prisma/client";

// Crea uno slug url-friendly da un nome
export const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Trova o crea la Category (il "tipo" di prodotto: carte, manga...).
// Va chiamata sempre con lo stesso slug fisso per ogni sync (es. "carte"),
// non con un nome dinamico ricevuto dall'API.
export async function resolveCategory(tx: any, slug: string, name: string) {
  return tx.category.upsert({
    where: { slug },
    update: {},
    create: { slug, name },
  });
}

// Trova o crea il Franchise partendo dal nome/etichetta esatta ricevuta
// dall'API esterna (aliasText). Se quell'alias è già mappato, riusa il
// Franchise esistente. Altrimenti crea sia il Franchise (con nome
// canonico, se fornito) sia l'alias, cosi la prossima volta lo riconosce.
export async function resolveFranchise(
  tx: any,
  aliasText: string,
  source: ExternalSource,
  canonicalName?: string,
) {
  const existingAlias = await tx.franchiseAlias.findUnique({
    where: { alias_source: { alias: aliasText, source } },
  });

  if (existingAlias) {
    return tx.franchise.findUniqueOrThrow({
      where: { id: existingAlias.franchiseId },
    });
  }

  const name = canonicalName || aliasText;
  const slug = createSlug(name);

  const franchise = await tx.franchise.upsert({
    where: { slug },
    update: {},
    create: { name, slug },
  });

  await tx.franchiseAlias.create({
    data: { alias: aliasText, source, franchiseId: franchise.id },
  });

  return franchise;
}