import './types.js'

const tg = window.Telegram.WebApp

tg.ready()
tg.expand()

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = (btn as HTMLButtonElement).dataset.tab

    document
      .querySelectorAll('.tab-btn')
      .forEach(b => b.classList.remove('active'))
    document
      .querySelectorAll('.tab-content')
      .forEach(c => c.classList.remove('active'))

    btn.classList.add('active')
    document.getElementById(tabName!)!.classList.add('active')
  })
})

const answerCard = document.getElementById('answer') as HTMLDivElement
const resultDiv = document.getElementById('result') as HTMLDivElement
const copyBtn = document.getElementById(
  'copyAnswer'
) as HTMLButtonElement | null
const loadingEl = document.getElementById('loading')!
const loadingPhraseEl = document.getElementById(
  'loadingPhrase'
) as HTMLParagraphElement

const loadingVariants = [
  document.getElementById('loaderVariant1'),
  document.getElementById('loaderVariant2'),
  document.getElementById('loaderVariant3'),
]

const loadingPhrases = [
  'Проверяю датчики и показания ЭБУ...',
  'Сверяю симптомы с типичными неисправностями...',
  'Сравниваю с сервисными бюллетенями...',
  'Анализирую возможные причины...',
  'Подбираю оптимальные рекомендации...',
  'Смотрю что могло выйти из строя...',
  'Оцениваю примерную стоимость ремонта...',
  'Собираю технические данные модели...',
]

// === АНИМАЦИЯ НАБОРА ФРАЗ ЗАГРУЗКИ ===
let typingAbort = false
let typingCyclePromise: Promise<void> | null = null

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

async function typeText(el: HTMLElement, text: string, speed = 35) {
  el.textContent = ''
  for (let i = 0; i < text.length && !typingAbort; i++) {
    el.textContent += text[i]
    await sleep(speed + Math.random() * 40)
  }
}

async function deleteText(el: HTMLElement, speed = 22) {
  while (el.textContent && !typingAbort) {
    el.textContent = el.textContent.slice(0, -1)
    await sleep(speed + Math.random() * 30)
  }
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function typingCycle() {
  while (!typingAbort && !loadingEl.classList.contains('hidden')) {
    const phrase = randomItem(loadingPhrases)
    await typeText(loadingPhraseEl, phrase)
    await sleep(800)
    await deleteText(loadingPhraseEl)
    await sleep(160)
  }
}

function startTyping() {
  typingAbort = false
  typingCyclePromise = typingCycle()
}

function stopTyping() {
  typingAbort = true
}

// === ФОРМАТИРОВАНИЕ РЕЗУЛЬТАТА ===
function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const headingStarts = [
  '🔍',
  '🔧',
  '💰',
  '⚠️',
  '📋',
  '💡',
  '🔤',
  '🚗',
  '1.',
  '2.',
  '3.',
  '4.',
  '5.',
]

function isHeading(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return false
  return (
    headingStarts.some(h => trimmed.startsWith(h)) && /[:：]$/.test(trimmed)
  )
}

function renderResult(raw: string) {
  const safe = escapeHtml(raw)
  const blocks = safe
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(Boolean)

  const html = blocks
    .map(block => {
      const lines = block
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)

      // Если одиночная строка-заголовок
      if (lines.length === 1 && isHeading(lines[0])) {
        return `<p class="section-heading">${lines[0]}</p>`
      }

      // Попытка собрать списки
      const listItems: string[] = []
      const otherLines: string[] = []

      lines.forEach(line => {
        if (/^•\s+/.test(line)) {
          listItems.push(`<li>${line.replace(/^•\s+/, '')}</li>`)
        } else if (/^-\s+/.test(line)) {
          listItems.push(`<li>${line.replace(/^-+\s+/, '')}</li>`)
        } else {
          otherLines.push(line)
        }
      })

      let section = ''

      // Если первая строка выглядит как заголовок внутри блока
      if (otherLines.length && isHeading(otherLines[0])) {
        section += `<p class="section-heading">${otherLines.shift()}</p>`
      }

      if (otherLines.length) {
        section += `<p>${otherLines.join('<br>')}</p>`
      }
      if (listItems.length) {
        section += `<ul class="bullet-list">${listItems.join('')}</ul>`
      }

      return section
    })
    .join('')

  return html || `<p>${safe}</p>`
}

// === ПЕРЕОПРЕДЕЛЕННЫЕ ФУНКЦИИ ЗАГРУЗКИ/ОТВЕТА ===
function clearActiveLoaders() {
  loadingVariants.forEach(v => v?.classList.remove('active'))
}

function showLoading() {
  loadingEl.classList.remove('hidden')
  answerCard.classList.add('hidden')
  clearActiveLoaders()
  randomItem(loadingVariants)?.classList.add('active')
  loadingPhraseEl.textContent = ''
  stopTyping()
  startTyping()
}

function hideLoading() {
  loadingEl.classList.add('hidden')
  stopTyping()
  loadingPhraseEl.textContent = ''
}

function showResult(text: string) {
  resultDiv.innerHTML = renderResult(text)
  answerCard.classList.remove('hidden', 'error')
  answerCard.classList.add('flash')
  setTimeout(() => answerCard.classList.remove('flash'), 1700)
}

function showError(text: string) {
  resultDiv.innerHTML = `<p>❌ Ошибка: ${escapeHtml(text)}</p>`
  answerCard.classList.remove('hidden')
  answerCard.classList.add('error', 'flash')
  setTimeout(() => answerCard.classList.remove('flash'), 1700)
}

async function apiCall(endpoint: string, data: any) {
  try {
    showLoading()

    const response = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Ошибка запроса')
    }

    hideLoading()
    showResult(result.result)

    tg.HapticFeedback.notificationOccurred('success')
  } catch (error) {
    hideLoading()
    showError((error as Error).message)
    tg.HapticFeedback.notificationOccurred('error')
  }
}

;(window as any).diagnose = async function () {
  const problem = (
    document.getElementById('problem') as HTMLTextAreaElement
  ).value.trim()
  if (!problem) {
    showError('Пожалуйста, опишите проблему')
    return
  }
  await apiCall('diagnose', { problem })
}
;(window as any).decodeOBD = async function () {
  const code = (document.getElementById('obdCode') as HTMLInputElement).value
    .trim()
    .toUpperCase()
  if (!code) {
    showError('Пожалуйста, введите код ошибки')
    return
  }
  await apiCall('code', { code })
}
;(window as any).searchParts = async function () {
  const partName = (
    document.getElementById('partName') as HTMLInputElement
  ).value.trim()
  const carModel = (
    document.getElementById('carModel') as HTMLInputElement
  ).value.trim()

  if (!partName || !carModel) {
    showError('Заполните оба поля')
    return
  }

  await apiCall('part-search', { partName, carModel })
}
;(window as any).getCarInfo = async function () {
  const carModel = (
    document.getElementById('carInfo') as HTMLInputElement
  ).value.trim()
  if (!carModel) {
    showError('Введите модель автомобиля')
    return
  }
  await apiCall('car-info', { carModel })
}
