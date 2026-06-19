import Anthropic from '@anthropic-ai/sdk';

interface EnrichBody {
  name: string;
  city?: string;
  state_province?: string;
  country?: string;
  layer_type: string;
}

interface BraveResult {
  title: string;
  url: string;
  description?: string;
}

export async function POST(request: Request) {
  const body: EnrichBody = await request.json();
  const { name, city, state_province, country, layer_type } = body;

  if (layer_type === 'population') {
    return Response.json({ skipped: true });
  }

  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!braveKey || !anthropicKey) {
    return Response.json({ error: 'API keys not configured' }, { status: 503 });
  }

  const query = [name, city, state_province, country].filter(Boolean).join(' ');

  let results: BraveResult[] = [];
  try {
    const braveRes = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      { headers: { 'X-Subscription-Token': braveKey, 'Accept': 'application/json' } },
    );
    if (braveRes.ok) {
      const braveData = await braveRes.json();
      results = (braveData.web?.results ?? []) as BraveResult[];
    }
  } catch {
    return Response.json({ error: 'Search unavailable' }, { status: 502 });
  }

  if (results.length === 0) {
    return Response.json({ data: null, sources: [] });
  }

  const locationStr = [city, state_province, country].filter(Boolean).join(', ');
  const snippets = results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description ?? ''}`)
    .join('\n\n');
  const sources = results.map((r) => ({ title: r.title, url: r.url }));

  const client = new Anthropic({ apiKey: anthropicKey });

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system:
      'You extract structured information about Jewish organizations from web search snippets. Return valid JSON only — no markdown fences, no prose.',
    messages: [
      {
        role: 'user',
        content: `Extract information about "${name}"${locationStr ? ` in ${locationStr}` : ''} from these web search results:\n\n${snippets}\n\nReturn a JSON object with exactly these fields (null for unknown):\n{"website":string|null,"phone":string|null,"address":string|null,"rabbi_director":string|null,"founded":string|null,"description":string|null}\n\nOnly include information that clearly refers to this specific organization.`,
      },
    ],
  });

  let data: Record<string, string | null> | null = null;
  for (const block of response.content) {
    if (block.type === 'text') {
      try {
        data = JSON.parse(block.text.replace(/```(?:json)?\n?|\n?```/g, '').trim());
      } catch {
        // ignore
      }
      break;
    }
  }

  return Response.json({ data, sources });
}
