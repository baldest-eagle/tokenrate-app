import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
  context: string;
  maxOutput: string;
  inputModalities: string[];
  outputModalities: string[];
  tier: string;
  capabilities: string[];
  description: string;
  useCase: string;
  standout: string;
  releaseDate: string;
}

function deriveModelInsights(
  name: string,
  rawDescription: string,
  contextNum: number,
  capabilities: string[],
  tier: string,
  provider: string
) {
  const lower = (name + ' ' + rawDescription).toLowerCase();

  // Intended Use Case
  let useCase = 'General purpose text generation, knowledge queries, and everyday assistant tasks.';
  if (lower.includes('code') || lower.includes('program') || lower.includes('develop') || lower.includes('coder') || lower.includes('software')) {
    useCase = 'Agentic software development, code refactoring, complex bug hunting, and automated pipeline execution.';
  } else if (lower.includes('reason') || lower.includes('math') || lower.includes('research') || lower.includes('science') || lower.includes('stem')) {
    useCase = 'Deep analytical research, complex mathematical reasoning, multi-step hypothesis evaluation, and technical writing.';
  } else if (capabilities.includes('vision') || lower.includes('vision') || lower.includes('multimodal')) {
    useCase = 'Multimodal document inspection, visual reasoning, UI/UX design analysis, and chart data extraction.';
  } else if (tier === 'Free') {
    useCase = 'Rapid zero-cost experimentation, lightweight automation scripts, and high-volume basic queries.';
  } else if (contextNum >= 500000) {
    useCase = 'Massive codebase analysis, full repository auditing, large document synthesis, and long-horizon chat.';
  }

  // What Makes It Stand Out
  const highlights: string[] = [];
  if (contextNum >= 1000000) {
    highlights.push('Massive 1M+ token context window');
  } else if (contextNum >= 500000) {
    highlights.push('Expansive 500k context window for long-horizon sessions');
  } else if (contextNum >= 128000) {
    highlights.push('Generous 128k+ context length');
  }

  if (tier === 'Free') {
    highlights.push('100% Free with zero token fees');
  }

  if (capabilities.includes('vision')) {
    highlights.push('High-fidelity multimodal visual understanding');
  }
  if (capabilities.includes('function-calling')) {
    highlights.push('Reliable tool-calling & structured JSON adherence');
  }

  if (lower.includes('flagship') || lower.includes('frontier') || lower.includes('pro') || lower.includes('astra') || lower.includes('sonnet') || lower.includes('opus')) {
    highlights.push('Frontier-grade reasoning benchmarks and enterprise reliability');
  } else if (lower.includes('flash') || lower.includes('mini') || lower.includes('fast') || lower.includes('haiku') || lower.includes('flex')) {
    highlights.push('Sub-second ultra-low latency with optimized throughput');
  }

  let standout = highlights.slice(0, 2).join('; ') + '.';
  if (standout === '.') {
    standout = `Optimized ${provider} architecture with balanced price-to-performance ratio.`;
  }

  return { useCase, standout };
}

export async function GET() {
  try {
    const modelsMap = new Map<string, AIModel>();

    // 1. Read local Hermes-Agent model catalogs to find available models
    const localAppData = process.env.LOCALAPPDATA || 'C:\\Users\\kyleh\\AppData\\Local';
    const hermesDir = path.join(localAppData, 'hermes');
    
    let allowedIds = new Set<string>();

    try {
      const providerCachePath = path.join(hermesDir, 'provider_models_cache.json');
      if (fs.existsSync(providerCachePath)) {
        const data = JSON.parse(fs.readFileSync(providerCachePath, 'utf8'));
        for (const provider in data) {
          if (data[provider].models) {
            data[provider].models.forEach((id: string) => allowedIds.add(id));
          }
        }
      }
    } catch (e) {
      console.warn("Could not read provider_models_cache.json");
    }

    try {
      const catalogPath = path.join(hermesDir, 'hermes-agent', 'website', 'static', 'api', 'model-catalog.json');
      if (fs.existsSync(catalogPath)) {
        const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        if (data.providers) {
          for (const prov in data.providers) {
            if (data.providers[prov].models) {
              data.providers[prov].models.forEach((m: any) => allowedIds.add(m.id));
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not read model-catalog.json");
    }

    // 2. Read Nous Portal cached metadata for stealth/custom models
    try {
      const nousCachePath = path.join(hermesDir, 'cache', 'nous_recommended_cache.json');
      if (fs.existsSync(nousCachePath)) {
        const data = JSON.parse(fs.readFileSync(nousCachePath, 'utf8'));
        const portal = data['https://portal.nousresearch.com'];
        if (portal && portal.data) {
          const lists = ['paidRecommendedModels', 'freeRecommendedModels'];
          for (const list of lists) {
            if (portal.data[list]) {
              for (const m of portal.data[list]) {
                allowedIds.add(m.modelName);
                
                // Parse price strings like "in $2.00 / out $6.00 per 1M" or "$0.00/1M"
                let inputPrice = 0;
                let outputPrice = 0;
                if (m.tokenPrice && m.tokenPrice.includes('in $')) {
                  const inMatch = m.tokenPrice.match(/in\s\$([0-9.]+)/);
                  const outMatch = m.tokenPrice.match(/out\s\$([0-9.]+)/);
                  if (inMatch) inputPrice = parseFloat(inMatch[1]);
                  if (outMatch) outputPrice = parseFloat(outMatch[1]);
                }

                let tier = (inputPrice === 0 && outputPrice === 0) ? 'Free' : 'Pro';
                const contextNum = m.contextLength ? parseInt(m.contextLength.toString()) : 8192;
                const capabilities = m.isVisionModel ? ['vision', 'function-calling'] : ['function-calling'];
                const provider = m.modelName.includes('stealth') ? 'Stealth' : 'Nous Portal';
                const name = m.displayName || m.modelName;
                const description = 'Model provided via Nous Portal / Hermes Agent network with direct agent integration.';
                const { useCase, standout } = deriveModelInsights(name, description, contextNum, capabilities, tier, provider);

                modelsMap.set(m.modelName, {
                  id: m.modelName,
                  name,
                  provider,
                  inputPrice,
                  outputPrice,
                  context: contextNum.toLocaleString(),
                  maxOutput: '4,096 tokens',
                  inputModalities: m.inputModalities || ['text'],
                  outputModalities: m.outputModalities || ['text'],
                  tier,
                  capabilities,
                  description,
                  useCase,
                  standout,
                  releaseDate: m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not read nous_recommended_cache.json");
    }

    // 3. Fetch from OpenRouter to get massive metadata list, but filter by allowedIds
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      next: { revalidate: 3600 }
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data && data.data && Array.isArray(data.data)) {
        for (const m of data.data) {
          // Check if this model or its basename is allowed by Hermes Agent
          const baseName = m.id.includes('/') ? m.id.split('/')[1] : m.id;
          if (!allowedIds.has(m.id) && !allowedIds.has(baseName)) {
            continue; // Skip models not available in Hermes
          }

          const idParts = m.id.split('/');
          const provider = idParts.length > 1 ? idParts[0].charAt(0).toUpperCase() + idParts[0].slice(1) : 'Unknown';
          
          let inputPrice = 0;
          let outputPrice = 0;
          
          if (m.pricing) {
            inputPrice = parseFloat(m.pricing.prompt || '0') * 1000000;
            outputPrice = parseFloat(m.pricing.completion || '0') * 1000000;
          }

          let tier = (inputPrice === 0 && outputPrice === 0) ? 'Free' : 'Pro';
          if (m.id.includes(':free') || m.id.includes('-free')) {
            tier = 'Free';
          }

          let capabilities: string[] = [];
          const lowerName = m.name.toLowerCase();
          
          if (lowerName.includes('gpt-4o') || lowerName.includes('vision') || lowerName.includes('claude 3') || lowerName.includes('gemini 1.5') || m.architecture?.input_modalities?.includes('image')) {
            capabilities.push('vision');
          }
          if (m.architecture?.instruct_type || lowerName.includes('gpt') || lowerName.includes('claude') || lowerName.includes('gemini') || lowerName.includes('llama') || lowerName.includes('deepseek')) {
            capabilities.push('function-calling');
          }
          capabilities = Array.from(new Set(capabilities));

          const contextNum = m.context_length ? parseInt(m.context_length.toString()) : 8192;
          const maxCompletion = m.top_provider?.max_completion_tokens;
          const maxOutput = maxCompletion ? `${parseInt(maxCompletion).toLocaleString()} tokens` : '4,096 tokens';
          const name = m.name || m.id;
          let rawDesc = m.description || 'A powerful language model available through Hermes Agent.';
          // Clean up awkward trailing cutoffs like "and..." or trailing dots
          let cleanDesc = rawDesc.replace(/\s+(and|\.\.\.)\s*$/i, '').trim();
          if (!cleanDesc.endsWith('.')) cleanDesc += '...';

          const { useCase, standout } = deriveModelInsights(name, rawDesc, contextNum, capabilities, tier, provider);
          const releaseDate = m.created ? new Date(m.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026';

          modelsMap.set(m.id, {
            id: m.id,
            name,
            provider,
            inputPrice,
            outputPrice,
            context: contextNum.toLocaleString(),
            maxOutput,
            inputModalities: m.architecture?.input_modalities || ['text'],
            outputModalities: m.architecture?.output_modalities || ['text'],
            tier,
            capabilities,
            description: cleanDesc,
            useCase,
            standout,
            releaseDate
          });
        }
      }
    }

    return NextResponse.json(Array.from(modelsMap.values()));
  } catch (error: any) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
