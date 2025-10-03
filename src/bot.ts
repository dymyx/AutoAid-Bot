import { Bot } from 'grammy'
import {
  createCarInfoPrompt,
  createDiagnosePrompt,
  createOBDCodePrompt,
  createPartsSearchPrompt,
} from './prompts/mechanic.js'
import { OllamaService } from './services/ollama.js'
import { cleanMarkdown } from './utils/formatters.js'

export function setupBot(bot: Bot, ollamaService: OllamaService) {
  const safeDeleteMessage = async (chatId: number, messageId: number) => {
    try {
      await bot.api.deleteMessage(chatId, messageId)
    } catch (error) {
      console.log('Не удалось удалить сообщение:', error)
    }
  }

  bot.command('start', async ctx => {
    await ctx.reply(
      '👋 *Привет! Я AutoAid* - твой виртуальный помощник-механик!\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '🚗 *Я помогу тебе с:*\n\n' +
        '🔍 Диагностикой проблем автомобиля\n' +
        '📟 Расшифровкой кодов ошибок OBD-II\n' +
        '🔧 Подбором запчастей с ценами\n' +
        '📋 Информацией об автомобилях\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '💡 Используй /help для списка всех команд',
      { parse_mode: 'Markdown' }
    )
  })

  bot.command('help', async ctx => {
    const helpText = `🛠 *ДОСТУПНЫЕ КОМАНДЫ*

━━━━━━━━━━━━━━━━━━━━

🔍 *Диагностика проблем*
/diagnose <описание проблемы>

📝 Пример:
\`/diagnose машина троит на холодную\`
\`/diagnose стук в передней подвеске\`

━━━━━━━━━━━━━━━━━━━━

📟 *Расшифровка OBD-II кодов*
/code <код ошибки>

📝 Пример:
\`/code P0420\`
\`/code P0301\`

━━━━━━━━━━━━━━━━━━━━

🔧 *Подбор запчастей*
/part\\_search <деталь> | <авто>

📝 Пример:
\`/part_search масляный фильтр | Toyota Camry 2020\`
\`/part_search тормозные колодки | BMW X5 2015\`

━━━━━━━━━━━━━━━━━━━━

🚗 *Информация об автомобиле*
/car\\_info <марка модель год>

📝 Пример:
\`/car_info Toyota Camry 2020\`
\`/car_info BMW X5 E70\`

━━━━━━━━━━━━━━━━━━━━

📊 *Проверить статус бота*
/status

━━━━━━━━━━━━━━━━━━━━

💬 Просто отправь команду с нужными параметрами!`

    await ctx.reply(helpText, { parse_mode: 'Markdown' })
  })

  bot.command('status', async ctx => {
    const isConnected = await ollamaService.checkConnection()

    if (isConnected) {
      await ctx.reply(
        '✅ Бот работает нормально!\n🤖 ИИ подключен и готов к работе.'
      )
    } else {
      await ctx.reply(
        '⚠️ Бот работает, но ИИ временно недоступен.\nПопробуйте позже.'
      )
    }
  })

  bot.command('diagnose', async ctx => {
    const problem = ctx.message?.text.replace('/diagnose', '').trim()

    if (!problem) {
      await ctx.reply(
        '❌ *Необходимо описание проблемы!*\n\n' +
          '━━━━━━━━━━━━━━━━━━━━\n\n' +
          '📝 *Формат:*\n' +
          '/diagnose <описание проблемы>\n\n' +
          '✅ *Примеры:*\n' +
          '• `/diagnose машина не заводится в мороз`\n' +
          '• `/diagnose стук в передней подвеске`\n' +
          '• `/diagnose троит двигатель на холостых`',
        { parse_mode: 'Markdown' }
      )
      return
    }

    const processingMsg = await ctx.reply(
      '🔄 *Анализирую проблему...*\n⏳ Это может занять некоторое время.'
    )

    try {
      const prompt = createDiagnosePrompt(problem)
      const response = await ollamaService.generateResponse(prompt)
      const cleanResponse = cleanMarkdown(response)

      await safeDeleteMessage(ctx.chat.id, processingMsg.message_id)

      await ctx.reply(
        `🚗 *ДИАГНОСТИКА ПРОБЛЕМЫ*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `${cleanResponse}`
      )
    } catch (error) {
      await safeDeleteMessage(ctx.chat.id, processingMsg.message_id)
      await ctx.reply(
        '❌ *Ошибка при обработке запроса*\n\n' +
          'Убедитесь, что Ollama запущена и попробуйте снова.'
      )
      console.error('Ошибка в /diagnose:', error)
    }
  })

  bot.command('code', async ctx => {
    const code = ctx.message?.text.replace('/code', '').trim().toUpperCase()

    if (!code) {
      await ctx.reply(
        '❌ *Необходим код ошибки!*\n\n' +
          '━━━━━━━━━━━━━━━━━━━━\n\n' +
          '📝 *Формат:*\n' +
          '/code <код ошибки>\n\n' +
          '✅ *Примеры:*\n' +
          '• `/code P0420`\n' +
          '• `/code P0301`\n' +
          '• `/code C1234`',
        { parse_mode: 'Markdown' }
      )
      return
    }

    const obdCodePattern = /^[PCBU][0-9]{4}$/
    if (!obdCodePattern.test(code)) {
      await ctx.reply(
        '⚠️ *Неверный формат кода!*\n\n' +
          '━━━━━━━━━━━━━━━━━━━━\n\n' +
          'OBD-II коды имеют формат:\n' +
          '• Первая буква: P, C, B или U\n' +
          '• Затем 4 цифры\n\n' +
          '✅ *Правильные примеры:*\n' +
          'P0420, C1234, B0001, U0100',
        { parse_mode: 'Markdown' }
      )
      return
    }

    const processingMsg = await ctx.reply(
      '🔄 *Расшифровываю код ошибки...*\n⏳ Подождите немного!'
    )

    try {
      const prompt = createOBDCodePrompt(code)
      const response = await ollamaService.generateResponse(prompt)
      const cleanResponse = cleanMarkdown(response)

      await safeDeleteMessage(ctx.chat.id, processingMsg.message_id)
      await ctx.reply(
        `📟 *РАСШИФРОВКА OBD-II КОДА*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🔢 Код: ${code}\n\n` +
          `${cleanResponse}`
      )
    } catch (error) {
      await safeDeleteMessage(ctx.chat.id, processingMsg.message_id)
      await ctx.reply('❌ *Ошибка при расшифровке кода*\nПопробуйте позже.')
      console.error('Ошибка в /code:', error)
    }
  })

  bot.command('part_search', async ctx => {
    const query = ctx.message?.text.replace('/part_search', '').trim()

    if (!query) {
      await ctx.reply(
        '❌ *Необходимы данные для поиска!*\n\n' +
          '━━━━━━━━━━━━━━━━━━━━\n\n' +
          '📝 *Формат:*\n' +
          '/part_search <деталь> | <авто>\n\n' +
          '✅ *Примеры:*\n' +
          '• `/part_search масляный фильтр | Toyota Camry 2020`\n' +
          '• `/part_search тормозные колодки | BMW X5 2015`\n' +
          '• `/part_search свечи зажигания | Honda Accord 2018`',
        { parse_mode: 'Markdown' }
      )
      return
    }

    const parts = query.split('|').map(p => p.trim())

    if (parts.length !== 2) {
      await ctx.reply(
        '⚠️ *Неверный формат запроса!*\n\n' +
          '━━━━━━━━━━━━━━━━━━━━\n\n' +
          '📝 Используй разделитель "|" между деталью и авто:\n\n' +
          '✅ *Правильно:*\n' +
          '`/part_search масляный фильтр | Toyota Camry 2020`',
        { parse_mode: 'Markdown' }
      )
      return
    }

    const [partName, carModel] = parts

    if (!partName || !carModel) {
      await ctx.reply(
        '⚠️ *Заполните оба поля!*\n\n' +
          '━━━━━━━━━━━━━━━━━━━━\n\n' +
          'Укажи и название детали, и модель авто\n\n' +
          '✅ *Пример:*\n' +
          '`/part_search тормозные диски | Mazda 3 2019`',
        { parse_mode: 'Markdown' }
      )
      return
    }

    const processingMsg = await ctx.reply(
      '🔄 *Подбираю запчасти...*\n' + '⏳ Анализирую совместимость и цены'
    )

    try {
      const prompt = createPartsSearchPrompt(partName, carModel)
      const response = await ollamaService.generateResponse(prompt)
      const cleanResponse = cleanMarkdown(response)

      await safeDeleteMessage(ctx.chat.id, processingMsg.message_id)
      await ctx.reply(
        `🔧 *ПОДБОР ЗАПЧАСТЕЙ*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🚗 Автомобиль: ${carModel}\n` +
          `🔩 Деталь: ${partName}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `${cleanResponse}`
      )
    } catch (error) {
      await safeDeleteMessage(ctx.chat.id, processingMsg.message_id)
      await ctx.reply('❌ *Ошибка при поиске запчастей*\nПопробуйте позже.')
      console.error('Ошибка в /part_search:', error)
    }
  })

  bot.command('car_info', async ctx => {
    const carModel = ctx.message?.text.replace('/car_info', '').trim()

    if (!carModel) {
      await ctx.reply(
        '❌ *Необходима модель автомобиля!*\n\n' +
          '━━━━━━━━━━━━━━━━━━━━\n\n' +
          '📝 *Формат:*\n' +
          '/car_info <марка модель год>\n\n' +
          '✅ *Примеры:*\n' +
          '• `/car_info Toyota Camry 2020`\n' +
          '• `/car_info BMW X5 E70`\n' +
          '• `/car_info Honda Accord 2018`\n' +
          '• `/car_info Volkswagen Passat B8`',
        { parse_mode: 'Markdown' }
      )
      return
    }

    const processingMsg = await ctx.reply(
      '🔄 *Собираю информацию об автомобиле...*\n' +
        '⏳ Анализирую характеристики, цены и проблемы'
    )

    try {
      const prompt = createCarInfoPrompt(carModel)
      const response = await ollamaService.generateResponse(prompt)
      const cleanResponse = cleanMarkdown(response)

      await safeDeleteMessage(ctx.chat.id, processingMsg.message_id)

      const fullMessage =
        `🚗 *ИНФОРМАЦИЯ ОБ АВТОМОБИЛЕ*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📋 Модель: ${carModel}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${cleanResponse}`

      if (fullMessage.length > 4000) {
        const header =
          `🚗 *ИНФОРМАЦИЯ ОБ АВТОМОБИЛЕ*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📋 Модель: ${carModel}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n`

        await ctx.reply(header)

        const chunks = cleanResponse.match(/.{1,3500}(\n|$)/gs) || [
          cleanResponse,
        ]
        for (const chunk of chunks) {
          await ctx.reply(chunk)
        }
      } else {
        await ctx.reply(fullMessage)
      }
    } catch (error) {
      await safeDeleteMessage(ctx.chat.id, processingMsg.message_id)
      await ctx.reply('❌ *Ошибка при получении информации*\nПопробуйте позже.')
      console.error('Ошибка в /car_info:', error)
    }
  })

  bot.on('message:text', async ctx => {
    const text = ctx.message.text

    if (text.startsWith('/')) {
      await ctx.reply(
        '❌ *Неизвестная команда*\n\n' +
          '━━━━━━━━━━━━━━━━━━━━\n\n' +
          '💡 Используй /help для списка доступных команд',
        { parse_mode: 'Markdown' }
      )
      return
    }

    await ctx.reply(
      '💡 *Чтобы я мог помочь, используй команды:*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '🔍 /diagnose - диагностика проблемы\n' +
        '📟 /code - расшифровка кода ошибки\n' +
        '🔧 /part_search - подбор запчастей\n' +
        '🚗 /car_info - информация об авто\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '📖 Или напиши /help для подробной справки',
      { parse_mode: 'Markdown' }
    )
  })

  bot.catch(err => {
    const ctx = err.ctx
    console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`)
    const e = err.error
    console.error('Детали ошибки:', e)
  })
}
