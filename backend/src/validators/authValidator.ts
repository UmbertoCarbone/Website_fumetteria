import { z } from 'zod';

// Schema per il Login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email è obbligatoria")
    .email("Formato email non valido"),
  password: z
    .string()
    .min(1, "La password è obbligatoria")
    .min(6, "La password deve avere almeno 6 caratteri")
});

// Schema per la Registrazione
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "L'email è obbligatoria")
    .email("Formato email non valido"),
  username: z
    .string()
    .trim()
    .min(1, "Lo username è obbligatorio")
    .min(3, "Lo username deve avere almeno 3 caratteri"),
  password: z
    .string()
    .min(1, "La password è obbligatoria")
    .min(8, "La password deve essere di almeno 8 caratteri")
    .max(72, "La password non può superare i 72 caratteri")
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;