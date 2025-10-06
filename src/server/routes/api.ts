import express, { Router } from 'express'
import {
  createCarInfoPrompt,
  createDiagnosePrompt,
  createOBDCodePrompt,
  createPartsSearchPrompt,
} from '../../bot/prompts/mechanic.js'
import { OllamaService } from '../../bot/services/ollama.js'
import { cleanMarkdown } from '../../bot/utils/formatters.js'

export function apiRouter(ollamaService: OllamaService): Router {
  const router = express.Router()

  // Проверка статуса
  router.get('/status', async (req, res) => {
    try {
      const isConnected = await ollamaService.checkConnection()
      res.json({ status: isConnected ? 'ok' : 'offline' })
    } catch (error) {
      res.status(500).json({ error: 'Ошибка проверки статуса' })
    }
  })

  // Диагностика
  router.post('/diagnose', async (req, res) => {
    try {
      const { problem } = req.body
      if (!problem) {
        return res.status(400).json({ error: 'Необходимо описание проблемы' })
      }

      const prompt = createDiagnosePrompt(problem)
      const response = await ollamaService.generateResponse(prompt)
      const cleanResponse = cleanMarkdown(response)

      res.json({ result: cleanResponse })
    } catch (error) {
      console.error('Ошибка в /api/diagnose:', error)
      res.status(500).json({ error: 'Ошибка при диагностике' })
    }
  })

  // Расшифровка кода
  router.post('/code', async (req, res) => {
    try {
      const { code } = req.body
      if (!code) {
        return res.status(400).json({ error: 'Необходим код ошибки' })
      }

      const obdCodePattern = /^[PCBU][0-9]{4}$/
      if (!obdCodePattern.test(code.toUpperCase())) {
        return res.status(400).json({ error: 'Неверный формат кода' })
      }

      const prompt = createOBDCodePrompt(code.toUpperCase())
      const response = await ollamaService.generateResponse(prompt)
      const cleanResponse = cleanMarkdown(response)

      res.json({ result: cleanResponse })
    } catch (error) {
      console.error('Ошибка в /api/code:', error)
      res.status(500).json({ error: 'Ошибка при расшифровке кода' })
    }
  })

  // Поиск запчастей
  router.post('/part-search', async (req, res) => {
    try {
      const { partName, carModel } = req.body
      if (!partName || !carModel) {
        return res
          .status(400)
          .json({ error: 'Необходимы название детали и модель авто' })
      }

      const prompt = createPartsSearchPrompt(partName, carModel)
      const response = await ollamaService.generateResponse(prompt)
      const cleanResponse = cleanMarkdown(response)

      res.json({ result: cleanResponse })
    } catch (error) {
      console.error('Ошибка в /api/part-search:', error)
      res.status(500).json({ error: 'Ошибка при поиске запчастей' })
    }
  })

  // Информация об авто
  router.post('/car-info', async (req, res) => {
    try {
      const { carModel } = req.body
      if (!carModel) {
        return res.status(400).json({ error: 'Необходима модель автомобиля' })
      }

      const prompt = createCarInfoPrompt(carModel)
      const response = await ollamaService.generateResponse(prompt)
      const cleanResponse = cleanMarkdown(response)

      res.json({ result: cleanResponse })
    } catch (error) {
      console.error('Ошибка в /api/car-info:', error)
      res.status(500).json({ error: 'Ошибка при получении информации' })
    }
  })

  return router
}
