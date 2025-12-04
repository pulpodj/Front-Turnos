import { z } from 'zod'


export const dniSchema = z.string().regex(/^\d{7,8}$/)
export const codeSchema = z.string().regex(/^\d{6}$/)
export const userSchema = z.string().min(3).max(50)
export const passSchema = z.string().min(6).max(200)


export const isValidDNI = v => dniSchema.safeParse(v).success
export const isValidCode = v => codeSchema.safeParse(v).success