// Valida un param di route come intero positivo, senza fidarsi di Number()
// (che accetta "12abc" -> NaN silenzioso, "" -> 0, ecc.). Accetta `unknown`
// perché a seconda della versione dei types di Express req.params.x è
// tipizzato come string | string[].
export function parseId(raw: unknown): number | null {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
