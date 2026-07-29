import type { VercelRequest, VercelResponse } from '@vercel/node'
import { issueSignedToken, presignUrl } from '@vercel/blob'

const PATHNAME = 'Debug.txt'

function getOidcToken(req: VercelRequest): string | undefined {
  const header = req.headers['x-vercel-oidc-token']
  return Array.isArray(header) ? header[0] : header
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const signedToken = await issueSignedToken({
      pathname: PATHNAME,
      operations: ['get'],
      oidcToken: getOidcToken(req),
    })

    const { presignedUrl } = await presignUrl(signedToken, {
      operation: 'get',
      pathname: PATHNAME,
      access: 'public',
    })

    res.status(200).json({ url: presignedUrl })
  } catch {
    res.status(502).json({ error: 'Failed to generate download token' })
  }
}
