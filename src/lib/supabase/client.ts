/**
 * SUPABASE CLIENT - SINGLETON
 * 
 * Este archivo re-exporta el cliente singleton para mantener
 * compatibilidad con imports existentes
 */

export { getSupabaseClient as createClient } from './client-singleton'
