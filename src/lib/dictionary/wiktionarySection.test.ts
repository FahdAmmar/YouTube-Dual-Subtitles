import { describe, it, expect } from 'vitest'
import { parseSectionEntries } from './wiktionarySection'

// Hand-written HTML in the shape of Wiktionary's rendered German section (headword line, form-of definitions,
// glossary links). It documents the markup the parser relies on; it is not a capture of the live site.
const NOUN_AND_PROPER_NOUN = `
<div class="mw-content-ltr mw-parser-output">
  <div class="mw-heading mw-heading2"><h2 id="German">German</h2></div>
  <div class="mw-heading mw-heading3"><h3 id="Etymology">Etymology</h3></div>
  <p>From Old High German <i>hūs</i>.</p>
  <div class="mw-heading mw-heading3"><h3 id="Noun">Noun</h3></div>
  <p><span class="headword-line"><strong class="Latn headword" lang="de">Haus</strong>&nbsp;<span class="gender"><abbr title="neuter gender">n</abbr></span>
     <span class="headword-features">(<i>strong, genitive</i> <b>Hauses</b>, <i>plural</i> <b>Häuser</b>)</span></span></p>
  <ol><li>house</li></ol>
  <div class="mw-heading mw-heading3"><h3 id="Proper_noun">Proper noun</h3></div>
  <p><span class="headword-line"><strong class="Latn headword" lang="de">Haus</strong> <span class="gender"><abbr>n</abbr></span> (<i>proper noun</i>)</span></p>
  <ol><li>a village</li></ol>
</div>`

const VERB_FORM = `
<div class="mw-parser-output">
  <div class="mw-heading mw-heading2"><h2 id="German">German</h2></div>
  <div class="mw-heading mw-heading3"><h3 id="Participle">Participle</h3></div>
  <p><span class="headword-line"><strong class="Latn headword" lang="de">gegangen</strong></span></p>
  <ol><li><span class="form-of-definition use-with-mention"><a href="/wiki/Appendix:Glossary#past_participle" title="Appendix:Glossary">past participle</a> of
     <span class="form-of-definition-link"><i class="Latn mention" lang="de"><a href="/wiki/gehen#German" title="gehen">gehen</a></i></span></span></li></ol>
</div>`

const INFLECTION_OF = `
<div class="mw-parser-output">
  <div class="mw-heading mw-heading3"><h3 id="Verb">Verb</h3></div>
  <p><strong class="Latn headword" lang="de">geht</strong></p>
  <ol><li><span class="form-of-definition use-with-mention"><a href="/wiki/Appendix:Glossary#third_person" title="Appendix:Glossary">third-person</a> <a href="/wiki/Appendix:Glossary#singular" title="Appendix:Glossary">singular</a> <a href="/wiki/Appendix:Glossary#present" title="Appendix:Glossary">present</a> of
     <span class="form-of-definition-link"><a href="/wiki/gehen#German" title="gehen">gehen</a></span></span></li></ol>
</div>`

describe('parseSectionEntries', () => {
  it('collects one entry per headword with its part-of-speech heading and full headword line', () => {
    const entries = parseSectionEntries(NOUN_AND_PROPER_NOUN)

    expect(entries.map((entry) => [entry.heading, entry.headword])).toEqual([
      ['noun', 'Haus'],
      ['proper noun', 'Haus'],
    ])
    expect(entries[0]?.line).toBe('Haus n (strong, genitive Hauses, plural Häuser)')
    expect(entries[0]?.formOf).toEqual([])
  })

  it('links an inflected form to its lemma using the lemma link, not the glossary links', () => {
    const [entry] = parseSectionEntries(VERB_FORM)

    expect(entry?.formOf).toEqual([{ lemma: 'gehen', description: 'past participle of gehen' }])
  })

  it('handles an inflection description made of several glossary links', () => {
    const [entry] = parseSectionEntries(INFLECTION_OF)

    expect(entry?.formOf).toEqual([{ lemma: 'gehen', description: 'third-person singular present of gehen' }])
  })

  it('falls back to the definition text when the form-of markup is missing', () => {
    // Same page, but without Wiktionary's dedicated form-of classes (a markup change would look like this)
    const html = `<h3>Participle</h3><p><strong class="headword">gegangen</strong></p>
      <ol><li>past participle of <a href="/wiki/gehen">gehen</a><ul><li>nested note</li></ul></li></ol>`
    const [entry] = parseSectionEntries(html)

    expect(entry?.formOf).toEqual([{ lemma: 'gehen', description: 'past participle of gehen' }])
  })

  it('does not treat the definition of a real lemma as an inflected form', () => {
    const html = `<h3>Noun</h3><p><strong class="headword">Plural</strong> m (strong, genitive Plurals, plural Plurale)</p>
      <ol><li>plural (grammatical number)</li><li>the state of being a form of the genitive</li></ol>`
    const [entry] = parseSectionEntries(html)

    expect(entry?.formOf).toEqual([])
  })

  it('ignores form-of text that appears before any headword', () => {
    const html = `<span class="form-of-definition"><span class="form-of-definition-link"><a>x</a></span></span>`
    expect(parseSectionEntries(html)).toEqual([])
  })

  it('does not run scripts or load resources from the untrusted HTML', () => {
    const entries = parseSectionEntries(
      `<h3>Noun</h3><p><strong class="headword">Haus</strong> n <img src=x onerror="window.__pwned = true"><script>window.__pwned = true</script></p>`,
    )
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
    expect(entries[0]?.line).not.toContain('pwned')
  })

  it('returns nothing for HTML without a headword', () => {
    expect(parseSectionEntries('<p>No entry</p>')).toEqual([])
  })
})
