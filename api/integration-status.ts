// Vercel Serverless Function: GET /api/integration-status
// Safely reports whether Asaas and Supabase environment variables are configured on Vercel/Server.

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const asaasKey = (process.env.ASAAS_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const supabaseKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return res.status(200).json({
    asaasConnected: Boolean(asaasKey && !asaasKey.includes('SEU_TOKEN')),
    supabaseConnected: Boolean(
      supabaseUrl &&
        !supabaseUrl.includes('SEU_PROJETO') &&
        supabaseKey &&
        !supabaseKey.includes('sua_chave')
    ),
  });
}
