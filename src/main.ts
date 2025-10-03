import dotenv from 'dotenv'
import { Bot } from 'grammy'
import { setupBot } from './bot.js'
import { OllamaService } from './services/ollama.js'

dotenv.config()

async function main() {
  const token = process.env.BOT_TOKEN
  const ollamaApi = process.env.OLLAMA_API
  const ollamaModel = process.env.OLLAMA_MODEL

  if (!token) {
    throw new Error('BOT_TOKEN не указан в .env файле')
  }

  if (!ollamaApi) {
    throw new Error('OLLAMA_API не указан в .env файле')
  }

  if (!ollamaModel) {
    throw new Error('OLLAMA_MODEL не указан в .env файле')
  }

  const ollamaService = new OllamaService(ollamaApi, ollamaModel)

  console.log('🔄 Проверка подключения к Ollama...')
  const isOllamaConnected = await ollamaService.checkConnection()

  if (isOllamaConnected) {
    console.log('✅ Ollama подключена успешно!')
    console.log(`📦 Используется модель: ${ollamaModel}`)
  } else {
    console.warn('⚠️  Предупреждение: Ollama недоступна!')
    console.warn('   Убедитесь, что Ollama запущена на:', ollamaApi)
    console.warn('   Бот будет запущен, но не сможет обрабатывать запросы.')
  }

  const bot = new Bot(token)

  setupBot(bot, ollamaService)

  bot.start({
    onStart: botInfo => {
      console.log('\n🤖 ========================================')
      console.log('🚀 Бот AutoAid успешно запущен!')
      console.log('========================================')
      console.log(`👤 Username: @${botInfo.username}`)
      console.log(`📝 Bot ID: ${botInfo.id}`)
      console.log(`🔧 Режим: Автомеханик`)
      console.log('========================================\n')
      console.log('✨ Ожидаю сообщений...\n')
    },
  })

  process.once('SIGINT', () => {
    console.log('\n⚠️  Получен сигнал SIGINT. Останавливаю бота...')
    bot.stop()
  })

  process.once('SIGTERM', () => {
    console.log('\n⚠️  Получен сигнал SIGTERM. Останавливаю бота...')
    bot.stop()
  })
}

main().catch(error => {
  console.error('❌ Критическая ошибка при запуске бота:')
  console.error(error)
  process.exit(1)
})
