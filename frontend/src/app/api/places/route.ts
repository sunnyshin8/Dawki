import { NextRequest, NextResponse } from 'next/server';

// ── Token cache (server-side, never exposed to browser) ────────────────────
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getMapplsToken(): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const key = process.env.MAPPLS_API_KEY;
  if (!key) return null;

  try {
    // Try OAuth client_credentials using the key as both client_id and client_secret
    // (Mappls single-key accounts use the key as the client_secret and the account email as client_id)
    // Alternatively, use the key directly as an access_token
    const res = await fetch(
      'https://outpost.mappls.com/api/security/oauth/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${key}&client_secret=${key}`,
      }
    );

    if (res.ok) {
      const data = await res.json();
      cachedToken = data.access_token;
      tokenExpiry = Date.now() + ((data.expires_in ?? 3600) - 120) * 1000;
      return cachedToken;
    }
  } catch {
    // fall through : use key directly as token
  }

  // Fallback: treat the API key itself as the access_token (some Mappls plans)
  cachedToken = key;
  tokenExpiry = Date.now() + 3 * 60 * 60 * 1000; // 3h
  return cachedToken;
}

// ── GET /api/places?q=<query> ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';

  if (q.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const token = await getMapplsToken();
    if (!token) {
      return NextResponse.json({ suggestions: [], error: 'API key not configured' });
    }

    // Mappls Autosuggest REST API
    const url = new URL('https://atlas.mappls.com/api/places/search/json');
    url.searchParams.set('query', `${q} Bengaluru`);
    url.searchParams.set('region', 'IND');
    url.searchParams.set('itemCount', '10');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      // 4 second timeout via AbortController
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.error('[Mappls Places] API error:', res.status, await res.text());
      return NextResponse.json({ suggestions: [] });
    }

    const data = await res.json();
    const raw: any[] = data.suggestedLocations ?? data.suggestions ?? [];

    const suggestions = raw
      .filter((loc) => loc.placeName || loc.placeAddress)
      .slice(0, 8)
      .map((loc) => ({
        name: loc.placeName ?? loc.placeAddress,
        address: loc.placeAddress ?? '',
        lat: parseFloat(loc.latitude ?? loc.lat ?? '0'),
        lon: parseFloat(loc.longitude ?? loc.lng ?? '0'),
        eLoc: loc.eLoc ?? '',
      }));

    return NextResponse.json({ suggestions });
  } catch (err: any) {
    console.error('[Mappls Places] fetch failed:', err?.message);
    return NextResponse.json({ suggestions: [] });
  }
}
