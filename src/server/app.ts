import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { OllamaService } from '../bot/services/ollama.js'
import { apiRouter } from './routes/api.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.WEBAPP_URL || '',
    ].filter(Boolean),
    credentials: true,
  })
)

app.use(express.json())
app.use(express.static(path.join(__dirname, '../../public')))

// Инициализация Ollama
const ollamaService = new OllamaService(
  process.env.OLLAMA_API || 'http://localhost:11434',
  process.env.OLLAMA_MODEL || 'llama3'
)

// Передаем сервис в роуты
app.use('/api', apiRouter(ollamaService))

// Главная страница Mini App
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'))
})

app.listen(PORT, () => {
  console.log(`🌐 Веб-сервер запущен на http://localhost:${PORT}`)
})
