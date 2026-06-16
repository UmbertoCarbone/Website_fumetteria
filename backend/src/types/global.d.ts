/**
 * Dichiarazione di modulo globale personalizzata.
 * Serve a comunicare a TypeScript che la libreria 'tcglookup' è un modulo valido,
 * evitando l'errore di compilazione ts(7016) dovuto alla mancanza di tipi ufficiali (.d.ts).
 */
declare module "tcglookup" {
  const TCGLookup: any;
  export default TCGLookup;
}
