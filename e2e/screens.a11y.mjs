/**
 * Real-browser accessibility check (WCAG 2 A/AA, including colour contrast, which jsdom cannot compute) of the
 * screens reading-mode.a11y.mjs does not cover: the home screen with its first-run guide, the settings panel,
 * and the vocabulary panel (list and review). Also checks that subtitle text shrinks on a phone-sized video.
 * Needs a Chrome binary: set CHROME_PATH (default /usr/bin/google-chrome), and CHROME_ARGS / E2E_HEADLESS if needed.
 *
 *   npm run build && npm run e2e:screens
 *
 * The helpers below are the same ones reading-mode.a11y.mjs uses; they are repeated rather than shared so that
 * the existing check stays untouched.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import puppeteer from 'puppeteer-core'
import { preview } from 'vite'

const PORT = Number(process.env.E2E_PORT ?? 4174)
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
const BASE_PATH = `/${(process.env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/')
const BASE_URL = `http://127.0.0.1:${PORT}${BASE_PATH}`
const CHROME_PATH = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const HEADLESS = process.env.E2E_HEADLESS === 'shell' ? 'shell' : true
const CHROME_ARGS = (process.env.CHROME_ARGS ?? '--no-sandbox --disable-gpu').split(' ').filter(Boolean)
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const SOURCE_SRT = `1
00:00:00,000 --> 00:00:05,000
مرحباً بكم في هذا الفيديو التعليمي
`
const TRANSLATION_SRT = `1
00:00:00,000 --> 00:00:05,000
Welcome to this learning video today
`

/** One saved word with a note and review state, so the vocabulary screens have real content to check */
const GLOSSARY_SEED = {
  'de::haus': {
    id: 'de::haus',
    word: 'Haus',
    languageCode: 'de',
    partOfSpeech: 'Substantiv',
    translation: 'بيت',
    definition: 'Gebäude zum Wohnen',
    example: null,
    note: 'ملاحظة تجريبية',
    addedAt: 1_700_000_000_000,
  },
}

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


async function runAxe(page, label, selector) {
  await page.evaluate(AXE_SOURCE)
  const results = await page.evaluate(
    async (scope, tags) => window.axe.run(scope ? document.querySelector(scope) : document, { runOnly: { type: 'tag', values: tags } }),
    selector,
    AXE_TAGS,
  )
  return results.violations.map((violation) => ({ screen: label, violation }))
}

async function openDialog(page, buttonLabel, dialogLabel) {
  await page.evaluate((label) => document.querySelector(`[aria-label="${label}"]`).click(), buttonLabel)
  await page.waitForSelector(`[role="dialog"][aria-label="${dialogLabel}"]`)
  // The drawer slides in: measuring colours mid-transform would give meaningless contrast numbers
  await new Promise((resolve) => setTimeout(resolve, 600))
}

async function closeDialogs(page) {
  await page.keyboard.press('Escape')
  await new Promise((resolve) => setTimeout(resolve, 500))
}

async function runScenario(browser, scenario) {
  // A fresh profile per scenario: watch history and the dismissed guide from an earlier scenario must not leak into this one
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  const pageErrors = []
  const findings = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  await page.setViewport({ width: scenario.width, height: scenario.height })
  await page.evaluateOnNewDocument(
    (theme, glossary) => {
      localStorage.setItem('ydc:theme-preference', JSON.stringify(theme))
      localStorage.setItem('ydc:glossary', JSON.stringify(glossary))
      window.__cspViolations = []
      document.addEventListener('securitypolicyviolation', (event) =>
        window.__cspViolations.push(`${event.violatedDirective} blocked ${event.blockedURI}`),
      )
    },
    scenario.theme,
    GLOSSARY_SEED,
  )

  // 1. Home screen with the first-run guide open (no watch history, guide not dismissed)
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => document.body.innerText.includes('ابدأ في ثلاث خطوات'))
  findings.push(...(await runAxe(page, 'home + guide')))

  // 2. Player screen, with a local video so no network is needed
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('[role="radio"]')].find((element) => element.textContent?.includes('ملف من جهازي'))
    if (!tab) throw new Error('Local file option not found on the start screen')
    tab.click()
  })
  await page.waitForSelector('input[aria-label="اختيار ملف فيديو محلي"]')
  await chooseGeneratedVideo(page, 'اختيار ملف فيديو محلي')
  await page.waitForFunction(() => document.body.innerText.includes('وضع العرض'), { timeout: 15000 })
  await chooseFile(page, 'رفع ملف ترجمة العربية', 'ar.srt', 'text/plain', SOURCE_SRT)
  await chooseFile(page, 'رفع ملف ترجمة الإنجليزية', 'en.srt', 'text/plain', TRANSLATION_SRT)
  await page.waitForFunction(() => document.body.innerText.includes('en.srt'), { timeout: 15000 })

  // Subtitle text follows the video's width: on a phone it must be smaller than the chosen 26px
  const translationFontSize = await page.evaluate(() => {
    const line = document.querySelector('[data-testid="subtitle-line-translation"] p')
    return line ? parseFloat(getComputedStyle(line).fontSize) : null
  })
  if (translationFontSize === null) pageErrors.push('Could not read the translation subtitle size')
  else if (scenario.width < 640 && translationFontSize >= 26) {
    pageErrors.push(`Subtitle text was not scaled down on a phone-sized video (${translationFontSize}px, chosen size 26px)`)
  }

  // The header's frosted glass: a build step that drops the standard backdrop-filter leaves it flat in Chrome and Firefox
  const headerBackdrop = await page.evaluate(() => {
    const header = document.querySelector('header')
    return header ? getComputedStyle(header).backdropFilter : null
  })
  if (!headerBackdrop || headerBackdrop === 'none') pageErrors.push(`The header lost its backdrop blur (computed backdrop-filter: ${headerBackdrop})`)

  // 3. Settings panel
  await openDialog(page, 'فتح إعدادات حجم ولون الترجمة', 'إعدادات عرض الترجمة')
  findings.push(...(await runAxe(page, 'settings panel', '[role="dialog"][aria-label="إعدادات عرض الترجمة"]')))
  await closeDialogs(page)

  // 4. Vocabulary panel: the list (search, filters, note), then a review card
  await openDialog(page, 'فتح المفردات الشخصية', 'المفردات الشخصية')
  const dialog = '[role="dialog"][aria-label="المفردات الشخصية"]'
  findings.push(...(await runAxe(page, 'vocabulary list', dialog)))
  await page.evaluate(() => {
    const start = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('مراجعة الكلمات المستحقة'))
    if (!start) throw new Error('Review button not found')
    start.click()
  })
  await page.waitForSelector(`${dialog} [role="progressbar"]`)
  findings.push(...(await runAxe(page, 'vocabulary review (question)', dialog)))
  await page.keyboard.press('Space')
  await page.waitForFunction(() => document.body.innerText.includes('بيت'))
  findings.push(...(await runAxe(page, 'vocabulary review (answer)', dialog)))

  const cspViolations = await page.evaluate(() => window.__cspViolations)
  await context.close()
  return { scenario, pageErrors: [...pageErrors, ...cspViolations.map((v) => `CSP violation: ${v}`)], findings }
}

const server = await preview({ logLevel: 'error', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } })
let exitCode = 0
try {
  await waitForServer()
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, args: CHROME_ARGS, headless: HEADLESS })
  try {
    for (const scenario of SCENARIOS) {
      const { pageErrors, findings } = await runScenario(browser, scenario)
      const status = findings.length === 0 && pageErrors.length === 0 ? 'OK  ' : 'FAIL'
      console.log(`${status} ${scenario.name}: ${findings.length} violations`)
      for (const { screen, violation } of findings) {
        exitCode = 1
        console.log(`     - [${screen}] [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} elements)`)
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
