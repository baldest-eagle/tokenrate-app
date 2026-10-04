import { NextResponse } from 'next/server';

const descriptionCache = new Map<string, string>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing model id' }, { status: 400 });
  }

  if (descriptionCache.has(id)) {
    return NextResponse.json({ description: descriptionCache.get(id) });
  }

  // Fetch full model page from OpenRouter
  try {
    const cleanId = id.replace(/:free$/, '').replace(/-free$/, '');
    const res = await fetch(`https://openrouter.ai/${cleanId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      next: { revalidate: 86400 }
    });

    if (res.ok) {
      const html = await res.text();
      const scriptRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
      let match;
      while ((match = scriptRegex.exec(html)) !== null) {
        try {
          const json = JSON.parse(match[1]);
          if (json['@type'] === 'SoftwareApplication' && json.description) {
            descriptionCache.set(id, json.description);
            return NextResponse.json({ description: json.description });
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn(`Could not scrape full description for ${id}:`, err);
  }

  return NextResponse.json({ description: null });
}
