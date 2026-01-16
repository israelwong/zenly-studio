/**
 * Variables de entorno de Supabase
 * Centraliza el acceso a las variables de entorno para mejor debugging
 */

export const getSupabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      '@supabase/ssr: Your project\'s URL and API key are required to create a Supabase client!\n\n' +
      'Check your Supabase project\'s API settings to find these values\n' +
      'https://supabase.com/dashboard/project/_/settings/api\n\n' +
      `Current values:\n` +
      `NEXT_PUBLIC_SUPABASE_URL: ${url ? 'defined' : 'undefined'}\n` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? 'defined' : 'undefined'}`
    );
  }

  return { url, anonKey };
};
