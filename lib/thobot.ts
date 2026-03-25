import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { Comment } from '@/models/Comment'
import { Post } from '@/models/Post'
import { Notification } from '@/models/Notification'
import { GroupMessage } from '@/models/GroupMessage'

export const BOT_USERNAME = 'thobot'
export const BOT_EMAIL    = 'thobot@skillallshow.internal'
// Plain-text password — stored hashed. Use these to log in and customize the bot.
export const BOT_PASSWORD_PLAIN = 'ThoBot2024!'

let _botId: string | null = null

export async function getBotUserId(): Promise<string> {
  if (_botId) return _botId
  await connectDB()

  let bot = await User.findOne({ username: BOT_USERNAME }).select('_id password').lean()

  if (!bot) {
    const hashed = await bcrypt.hash(BOT_PASSWORD_PLAIN, 10)
    bot = await User.create({
      username:    BOT_USERNAME,
      email:       BOT_EMAIL,
      password:    hashed,
      displayName: 'ThoBot',
      bio:         'Soy el asistente IA de Skill All Show. Mencioname con @thobot para preguntarme lo que quieras.',
      role:        'user',
      badges:      ['bot', 'verified'],
    })
  } else {
    // If the bot was created before with a plain-text password, re-hash it
    const pw = (bot as any).password ?? ''
    if (!pw.startsWith('$2')) {
      const hashed = await bcrypt.hash(BOT_PASSWORD_PLAIN, 10)
      await User.findByIdAndUpdate((bot as any)._id, { password: hashed, badges: ['bot', 'verified'] })
    }
  }

  _botId = (bot as any)._id.toString()
  return _botId!
}

/** Extract all @username mentions from a text */
export function extractMentions(text: string): string[] {
  const raw = text.match(/@([a-zA-Z0-9_]+)/g) ?? []
  return [...new Set(raw.map(m => m.slice(1).toLowerCase()))]
}

async function callGroq(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  const model  = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant'
  if (!apiKey) return 'Lo siento, no estoy disponible ahora mismo.'

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      max_tokens: 600,
      temperature: 0.7,
    }),
  })

  if (!res.ok) return 'Lo siento, tuve un error al procesar tu solicitud.'
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? 'No pude generar una respuesta.'
}

export async function triggerBotReply(
  postId: string,
  postContext: string,
  question: string,
  parentCommentId?: string | null,
) {
  try {
    const systemPrompt = `Eres ThoBot, el asistente IA de Skill All Show. Reglas estrictas:

1. Responde SIEMPRE en el mismo idioma que el usuario (detecta si es español, inglés, etc.)
2. Sé CONCISO: máximo 2-3 oraciones por defecto. Solo extiéndete si el usuario explícitamente pide "explica más", "detalla", "extiende" o similar.
3. Separa tus párrafos con una línea en blanco. NUNCA pegues todo el texto junto.
4. Si listas cosas, pon cada ítem en su propia línea con "- " al inicio.
5. No uses markdown pesado (no **negrita**, no # títulos). Solo texto limpio.
6. Sé directo: no repitas la pregunta del usuario ni des introducciones largas.

Contexto del post donde te mencionaron: "${postContext.slice(0, 400)}"`

    const cleanQuestion = question.replace(/@thobot/gi, '').trim() || question

    const [botId, reply] = await Promise.all([
      getBotUserId(),
      callGroq(systemPrompt, cleanQuestion),
    ])

    const comment = await Comment.create({
      content:       reply,
      author:        botId,
      post:          postId,
      parentComment: parentCommentId ?? null,
    })

    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } })
    return comment
  } catch (err) {
    console.error('[ThoBot]', err)
  }
}

/** Reply as ThoBot inside a group chat */
export async function triggerBotGroupReply(
  groupId: string,
  recentContext: string,
  question: string,
) {
  try {
    const systemPrompt = `Eres ThoBot, el asistente IA de Skill All Show. Reglas estrictas:

1. Responde SIEMPRE en el mismo idioma que el usuario (detecta si es español, inglés, etc.)
2. Sé CONCISO: máximo 2-3 oraciones por defecto. Solo extiéndete si el usuario pide "explica más", "detalla" o similar.
3. Separa tus párrafos con una línea en blanco. NUNCA pegues todo el texto junto.
4. Si listas cosas, pon cada ítem en su propia línea con "- " al inicio.
5. No uses markdown pesado. Solo texto limpio.
6. Sé directo: no repitas la pregunta ni des introducciones largas.

Estás en un chat grupal. Contexto reciente: "${recentContext.slice(0, 400)}"`

    const cleanQuestion = question.replace(/@thobot/gi, '').trim() || question

    const [botId, reply] = await Promise.all([
      getBotUserId(),
      callGroq(systemPrompt, cleanQuestion),
    ])

    await GroupMessage.create({ group: groupId, author: botId, content: reply })
  } catch (err) {
    console.error('[ThoBot Group]', err)
  }
}

export async function notifyMentions(
  text: string,
  authorId: string,
  postId: string,
  postText: string,
) {
  const mentions = extractMentions(text).filter(u => u !== BOT_USERNAME)
  if (mentions.length === 0) return

  await connectDB()
  const users = await User.find({ username: { $in: mentions } }).select('_id').lean()

  for (const u of users) {
    const uid = (u as any)._id.toString()
    if (uid === authorId) continue
    Notification.create({
      user: uid,
      type: 'mention',
      from: authorId,
      post: postId,
      text: postText.slice(0, 80),
    }).catch(() => {})
  }
}
