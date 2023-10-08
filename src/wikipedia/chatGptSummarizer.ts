import OpenAI from 'openai'
import { generateCacheKey, readFromCache, writeToCache } from './chatGptCache'
import pLimit from 'p-limit'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// run only 1 call at once
// to avoid problems
const limit = pLimit(1)

export async function summarizeWithChatGptCached(
  paragraph: string,
): Promise<string> {
  const cacheKey = generateCacheKey(paragraph)
  const cacheValue = readFromCache(cacheKey)
  if (cacheValue) {
    return cacheValue
  }
  const value = await summarizeWithChatGpt(paragraph)
  writeToCache(cacheKey, value)
  return value
}

async function summarizeWithChatGpt(
  paragraph: string,
  model: 'gpt-3.5-turbo' | 'gpt-3.5-turbo-16k' = 'gpt-3.5-turbo',
): Promise<string> {
  try {
    const res = await limit(async () => {
      console.log('>>> chatGpt')
      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'Tu es un écrivain/journaliste professionnel, avec un sens de la pédagogie. Tu sais écrire des phrases claires et limpides que les gens comprennent. ',
          },
          {
            role: 'user',
            content: `Résume ce paragraphe en une seule courte phrase :
  
  ${paragraph}`,
          },
        ],
      })
      if (chatCompletion.choices.length === 0) {
        throw new Error('Found no choices array in ChatGPT response')
      }
      const [choice] = chatCompletion.choices
      if (choice.finish_reason !== 'stop') {
        throw new Error(
          `ChatGPT finished with reason : ${choice.finish_reason}`,
        )
      }
      if (!choice.message.content) {
        throw new Error(`Message content from ChatGPT was empty or null`)
      }
      return choice.message.content
    })
    return res
  } catch (err) {
    if (
      err instanceof OpenAI.BadRequestError &&
      err.code === 'context_length_exceeded'
    ) {
      if (model === 'gpt-3.5-turbo') {
        console.log(
          'Max content length exceeded with GPT 3.5, will retry with with GPT 3.5 16K',
        )
        return summarizeWithChatGpt(paragraph, 'gpt-3.5-turbo-16k')
      }
      console.log(
        'Max content length exceeded even with GPT 3.5 16K ! Paragraph started with :' +
          paragraph.slice(0, 30),
      )
    }
    throw err
  }
}
