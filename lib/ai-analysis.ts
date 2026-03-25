import type { AIVerdict } from '@/models/Post'

export interface PostAnalysis {
  verdict:    AIVerdict
  reason:     string
  flags:      string[]
  analyzedAt: Date
}

const SUSPICIOUS_PATTERNS = [
  /https?:\/\//gi,           // any URL
  /\.(exe|bat|cmd|sh|ps1|msi|dmg|apk|jar)\b/gi,  // executable extensions
  /discord\.gg\//gi,
  /t\.me\//gi,
  /bit\.ly|tinyurl|goo\.gl/gi,
]

export async function analyzePost(title: string, content: string): Promise<PostAnalysis> {
  const fullText = `${title}\n${content}`
  const flags: string[] = []

  // Quick local pre-checks
  if (SUSPICIOUS_PATTERNS[0].test(fullText)) flags.push('contiene_links')
  if (SUSPICIOUS_PATTERNS[1].test(fullText)) flags.push('archivo_ejecutable')
  if (SUSPICIOUS_PATTERNS[2].test(fullText) || SUSPICIOUS_PATTERNS[3].test(fullText)) flags.push('link_externo_sospechoso')
  if (SUSPICIOUS_PATTERNS[4].test(fullText)) flags.push('link_acortado')

  const apiKey = process.env.GROQ_API_KEY
  const model  = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant'

  if (!apiKey) {
    return {
      verdict:    flags.length > 1 ? 'suspicious' : 'good',
      reason:     flags.length > 0 ? `Detectado localmente: ${flags.join(', ')}` : 'Sin API de IA configurada',
      flags,
      analyzedAt: new Date(),
    }
  }

  const prompt = `Eres un moderador de contenido para un foro de comunidad llamado "Skill All Show".
Analiza este post y responde SOLO con un objeto JSON válido sin markdown.

Título: ${title}
Contenido: ${content}

Evalúa:
1. ¿Es spam o publicidad no solicitada?
2. ¿Contiene contenido ofensivo, violento u odio?
3. ¿Parece phishing, malware o estafa?
4. ¿Tiene links sospechosos o acortados?
5. ¿La calidad del contenido es buena?

Responde exactamente con este JSON:
{"verdict":"good"|"bad"|"suspicious","reason":"explicación en español de máximo 100 caracteres","flags":["flag1","flag2"]}`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      }),
    })

    if (!res.ok) throw new Error(`GROQ error: ${res.status}`)

    const data = await res.json()
    const raw  = data.choices?.[0]?.message?.content?.trim() ?? ''

    // Extract JSON even if wrapped in backticks
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    const verdict: AIVerdict = ['good', 'bad', 'suspicious'].includes(parsed.verdict)
      ? parsed.verdict
      : 'suspicious'

    return {
      verdict,
      reason:     parsed.reason ?? '',
      flags:      [...new Set([...flags, ...(parsed.flags ?? [])])],
      analyzedAt: new Date(),
    }
  } catch {
    // Fallback to local analysis if GROQ fails
    return {
      verdict:    flags.length >= 2 ? 'suspicious' : flags.length === 1 ? 'suspicious' : 'good',
      reason:     flags.length > 0 ? `Análisis local: ${flags.join(', ')}` : 'Análisis completado',
      flags,
      analyzedAt: new Date(),
    }
  }
}
