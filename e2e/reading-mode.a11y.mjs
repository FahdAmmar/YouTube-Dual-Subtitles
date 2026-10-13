/**
 * Real-browser accessibility check of reading mode (WCAG 2 A/AA, including colour contrast,
 * which jsdom cannot compute) plus a Content-Security-Policy violation check, on the production build.
 * Needs a Chrome binary: set CHROME_PATH (default /usr/bin/google-chrome), and CHROME_ARGS / E2E_HEADLESS if needed.
 *
 *   npm run build && npm run e2e
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import puppeteer from 'puppeteer-core'
import { preview } from 'vite'

const require = createRequire(import.meta.url)
const PORT = Number(process.env.E2E_PORT ?? 4173)
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
// BASE_PATH (e.g. /dual/) checks a sub-folder deployment, exactly as GitHub Pages serves it
const BASE_PATH = `/${(process.env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/')
const BASE_URL = `http://127.0.0.1:${PORT}${BASE_PATH}`
const CHROME_PATH = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
// Regular Chrome uses the new headless mode; a chrome-headless-shell binary needs E2E_HEADLESS=shell
const HEADLESS = process.env.E2E_HEADLESS === 'shell' ? 'shell' : true
const CHROME_ARGS = (process.env.CHROME_ARGS ?? '--no-sandbox --disable-gpu').split(' ').filter(Boolean)

const SOURCE_SRT = `1
00:00:00,000 --> 00:00:05,000
مرحباً بكم في هذا الفيديو التعليمي

2
00:00:06,000 --> 00:00:10,000
هذه هي الجملة الثانية
`
const TRANSLATION_SRT = `1
00:00:00,000 --> 00:00:05,000
Welcome to this learning video today

2
00:00:06,000 --> 00:00:10,000
This is the second sentence
`

const SCENARIOS = [
  { name: 'desktop dark', theme: 'dark', width: 1280, height: 800 },
  { name: 'desktop light', theme: 'light', width: 1280, height: 800 },
  { name: 'mobile dark', theme: 'dark', width: 390, height: 844 },
  { name: 'mobile light', theme: 'light', width: 390, height: 844 },
]

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(BASE_URL)).ok) return
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Preview server did not start on ${BASE_URL}`)
}

/** Sets a file on an <input type=file> the way a user's choice would, so the app's own change handler runs */
async function chooseFile(page, label, name, type, content) {
  await page.evaluate(
    (inputLabel, fileName, mimeType, text) => {
      const input = document.querySelector(`input[aria-label="${inputLabel}"]`)
      if (!input) throw new Error(`No file input labelled ${inputLabel}`)
      const transfer = new DataTransfer()
      transfer.items.add(new File([text], fileName, { type: mimeType }))
      input.files = transfer.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    },
    label,
    name,
    type,
    content,
  )
}

/**
 * Records a short real video in the browser itself (canvas + MediaRecorder), so the test needs no
 * video asset and no ffmpeg, and the player genuinely loads it. It is then chosen like a user would.
 */
async function chooseGeneratedVideo(page, inputLabel) {
  await page.evaluate(async (label) => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 180
    const context = canvas.getContext('2d')
    let frame = 0
    const draw = () => {
      context.fillStyle = `hsl(${(frame * 6) % 360}, 55%, 35%)`
      context.fillRect(0, 0, canvas.width, canvas.height)
      frame += 1
    }
    draw()
    const timer = setInterval(draw, 50)
    const recorder = new MediaRecorder(canvas.captureStream(20), { mimeType: 'video/webm' })
    const chunks = []
    recorder.ondataavailable = (event) => chunks.push(event.data)
    const stopped = new Promise((resolve) => (recorder.onstop = resolve))
    recorder.start()
    await new Promise((resolve) => setTimeout(resolve, 1500))
    recorder.stop()
    await stopped
    clearInterval(timer)

    const transfer = new DataTransfer()
    transfer.items.add(new File([new Blob(chunks, { type: 'video/webm' })], 'lesson.webm', { type: 'video/webm' }))
    const input = document.querySelector(`input[aria-label="${label}"]`)
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, inputLabel)
}

async function runScenario(browser, scenario) {
  const page = await browser.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  await page.setViewport({ width: scenario.width, height: scenario.height })
  await page.evaluateOnNewDocument((theme) => {
    localStorage.setItem('ydc:theme-preference', JSON.stringify(theme))
    window.__cspViolations = []
    document.addEventListener('securitypolicyviolation', (event) =>
      window.__cspViolations.push(`${event.violatedDirective} blocked ${event.blockedURI}`),
    )
  }, scenario.theme)
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' })

  // A local file avoids needing the network
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('[role="radio"]')].find((element) => element.textContent?.includes('ملف من جهازي'))
    if (!tab) throw new Error('Local file option not found on the start screen')
    tab.click()
  })
  await page.waitForSelector('input[aria-label="اختيار ملف فيديو محلي"]')
  await chooseGeneratedVideo(page, 'اختيار ملف فيديو محلي')
  await page.waitForFunction(() => document.body.innerText.includes('DISPLAY_MODE'), { timeout: 15000 })
  await chooseFile(page, 'رفع ملف ترجمة العربية', 'ar.srt', 'text/plain', SOURCE_SRT)
  await chooseFile(page, 'رفع ملف ترجمة الإنجليزية', 'en.srt', 'text/plain', TRANSLATION_SRT)
  await page.waitForFunction(() => document.body.innerText.includes('en.srt'), { timeout: 15000 })

  // Layout check jsdom cannot make: a short sentence must fit on one line of the burned-in subtitle.
  // (A percentage max-width on a shrink-wrapped box once forced the last word of the longest line onto its own row.)
  // Each word of the translation line is its own button, so count the distinct rows the words sit on.
  const subtitleLineCount = await page.evaluate(() => {
    const line = document.querySelector('[data-testid="subtitle-line-translation"] p')
    if (!line?.textContent.includes('Welcome')) return null
    return new Set([...line.querySelectorAll('button')].map((word) => Math.round(word.getBoundingClientRect().top))).size
  })
  if (scenario.width >= 1024 && subtitleLineCount !== 1) {
    pageErrors.push(`Subtitle overlay wrapped a short sentence onto ${subtitleLineCount} lines (expected 1)`)
  }

  // The control bar is always visible and paints over whatever is behind it, so the lowest subtitle line must sit above it
  const overlap = await page.evaluate(() => {
    const bottoms = [...document.querySelectorAll('[data-testid^="subtitle-line-"]')].map((line) => line.getBoundingClientRect().bottom)
    const progress = document.querySelector('[aria-label="موضع التشغيل الحالي في الفيديو"]')?.getBoundingClientRect()
    return bottoms.length > 0 && progress ? Math.round(Math.max(...bottoms) - progress.top) : null
  })
  if (overlap === null) pageErrors.push('Could not measure the subtitle box against the control bar')
  else if (overlap > 0) pageErrors.push(`Subtitle box overlaps the control bar by ${overlap}px`)

  // A DOM click, not a click at screen coordinates: the layout still shifts while the video's metadata loads
  await page.evaluate(() => document.querySelector('[aria-label="فتح وضع القراءة"]').click())
  try {
    await page.waitForSelector('section[aria-label="وضع القراءة"] article[data-status="active"]', { timeout: 15000 })
  } catch (error) {
    // A bare timeout says nothing: report what the page actually showed
    const state = await page.evaluate(() => ({
      cards: [...document.querySelectorAll('section[aria-label="وضع القراءة"] article')].map((card) => card.getAttribute('data-status')),
      video: (() => {
        const video = document.querySelector('video')
        return video ? { readyState: video.readyState, time: video.currentTime, duration: video.duration, ended: video.ended } : null
      })(),
      text: document.body.innerText.slice(0, 200).replace(/\n+/g, ' | '),
    }))
    throw new Error(`${error.message}\n${JSON.stringify(state)}`)
  }

  // Injected over the DevTools protocol: the app's own Content-Security-Policy stays in force while testing
  await page.evaluate(AXE_SOURCE)
  const results = await page.evaluate(async () =>
    window.axe.run(document.querySelector('section[aria-label="وضع القراءة"]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    }),
  )
  const cspViolations = await page.evaluate(() => window.__cspViolations)
  await page.close()

  return { scenario, pageErrors: [...pageErrors, ...cspViolations.map((v) => `CSP violation: ${v}`)], violations: results.violations, passes: results.passes.length }
}

// Serves the production build (dist) exactly as it ships, including its Content-Security-Policy
const server = await preview({ logLevel: 'error', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } })
let exitCode = 0
try {
  await waitForServer()
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, args: CHROME_ARGS, headless: HEADLESS })
  try {
    for (const scenario of SCENARIOS) {
      const { pageErrors, violations, passes } = await runScenario(browser, scenario)
      const status = violations.length === 0 && pageErrors.length === 0 ? 'OK  ' : 'FAIL'
      console.log(`${status} ${scenario.name}: ${passes} checks passed, ${violations.length} violations`)
      for (const violation of violations) {
        exitCode = 1
        console.log(`     - [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} elements)`)
        for (const node of violation.nodes.slice(0, 3)) console.log(`         ${node.target.join(' ')}  ${node.any[0]?.message ?? ''}`)
      }
      for (const error of pageErrors) {
        exitCode = 1
        console.log(`     - page error: ${error}`)
      }
    }
  } finally {
    await browser.close()
  }
} catch (error) {
  console.error(error)
  exitCode = 1
} finally {
  await server.close()
}
process.exit(exitCode)
