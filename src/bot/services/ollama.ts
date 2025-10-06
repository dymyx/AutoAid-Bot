import axios from 'axios'

interface OllamaResponse {
  model: string
  response: string
  done: boolean
}

export class OllamaService {
  private apiUrl: string
  private model: string

  constructor(apiUrl: string, model: string) {
    this.apiUrl = apiUrl
    this.model = model
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await axios.post<OllamaResponse>(
        `${this.apiUrl}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      )

      return response.data.response
    } catch (error) {
      console.error('Ошибка при обращении к Ollama:', error)
      throw new Error('Не удалось получить ответ от ИИ')
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/tags`, {
        timeout: 5000,
      })
      return response.status === 200
    } catch (error) {
      console.error('Ollama недоступна:', error)
      return false
    }
  }
}
