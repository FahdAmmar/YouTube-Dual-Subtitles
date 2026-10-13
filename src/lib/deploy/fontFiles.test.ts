import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Reads a file from the project root (tests run from there) */
const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

const fontsCss = read('src/styles/fonts.css')
const referencedFiles = [...fontsCss.matchAll(/url\('\/fonts\/([^']+\.woff2)'\)/g)].map((match) => match[1]!)

describe('font files', () => {
  it('serves every font the stylesheet asks for', () => {
    expect(referencedFiles.length).toBeGreaterThan(0)
    for (const file of referencedFiles) {
      expect(existsSync(resolve(process.cwd(), 'public/fonts', file)), `${file} is missing from public/fonts`).toBe(true)
    }
  })

  it('ships no font file that the stylesheet never uses', () => {
    const onDisk = readdirSync(resolve(process.cwd(), 'public/fonts')).filter((name) => name.endsWith('.woff2'))
    expect(onDisk.filter((name) => !referencedFiles.includes(name))).toEqual([])
  })

  it('splits IBM Plex Sans and Mono by character range, so a normal visit does not download every script', () => {
    const splitFaces = fontsCss.match(/font-family: 'IBM Plex (?:Sans|Mono)';[^}]*unicode-range:/g) ?? []
    const allFaces = fontsCss.match(/font-family: 'IBM Plex (?:Sans|Mono)';/g) ?? []
    expect(allFaces.length).toBeGreaterThan(0)
    expect(splitFaces).toHaveLength(allFaces.length)
  })

  it('preloads only fonts that exist', () => {
    const preloaded = [...read('index.html').matchAll(/<link rel="preload" href="\/fonts\/([^"]+)"/g)].map((match) => match[1]!)
    expect(preloaded.length).toBeGreaterThan(0)
    for (const file of preloaded) {
      expect(referencedFiles).toContain(file)
    }
  })
})
