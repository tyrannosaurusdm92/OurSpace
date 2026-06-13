export type PsychiatrySignal = {
  key: string
  label: string
  level: 'critical' | 'high' | 'medium' | 'low'
  score: number
  hits: string[]
  evidence: string
}

const primary = [
  { key: 'self_harm', level: 'critical' as const, label: 'Self-harm / suicide language', phrases: ['kill myself','suicide','suicidal','want to die','hurt myself','self harm','self-harm','overdose','not safe with myself','cannot stay safe','can’t stay safe'] },
  { key: 'medical_red_flag', level: 'critical' as const, label: 'Medical red flag language', phrases: ['chest pain','cannot breathe','can’t breathe','trouble breathing','stroke','seizure','anaphylaxis','blue lips','oxygen dropped','fainting'] },
  { key: 'acute_overload', level: 'high' as const, label: 'Acute dysregulation / panic / overload', phrases: ['spiraling','panic attack','meltdown','shutdown','overwhelmed','too much','rage','dissociating','can’t calm down','cannot calm down'] },
]
const secondary = [
  { key: 'care_block', level: 'medium' as const, label: 'Basic care blocked', phrases: ['haven’t showered','havent showered','cannot shower','can’t shower','haven’t eaten','havent eaten','forgot to eat','not eating','dehydrated','cannot cook','can’t cook'] },
  { key: 'adhd_exec', level: 'medium' as const, label: 'ADHD / executive function support', phrases: ['can’t start','cannot start','too many steps','lost track of time','forgot','doom scrolling','stuck','freeze','frozen','executive dysfunction','decision paralysis'] },
  { key: 'shame', level: 'medium' as const, label: 'Shame / self-attack', phrases: ['useless','worthless','lazy','failure','bad person','hate myself','gross','burden','pathetic','stupid','i ruin everything'] },
  { key: 'attachment', level: 'medium' as const, label: 'Rejection / abandonment cue', phrases: ['they hate me','abandoned','leave me','rejected','ignored me','no one cares','too needy','clingy','people always leave','are you mad at me'] },
  { key: 'pain_mobility', level: 'medium' as const, label: 'Pain / mobility / fatigue access barrier', phrases: ['wheelchair','walker','cane','shower chair','stairs','fall','pain flare','fatigue','exhausted','bedridden','can barely walk','oxygen','spoons','pacing'] },
]

function clean(input: unknown): string { return String(input ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }
function evidence(text: string, phrases: string[]): string {
  const c = clean(text), low = c.toLowerCase()
  for (const phrase of phrases) {
    const idx = low.indexOf(phrase.toLowerCase())
    if (idx >= 0) return c.slice(Math.max(0, idx - 90), Math.min(c.length, idx + phrase.length + 100))
  }
  return c.slice(0, 260)
}
function detect(text: string, rules: typeof primary, base: number): PsychiatrySignal[] {
  const low = clean(text).toLowerCase()
  return rules.map((r) => {
    const hits = r.phrases.filter((p) => low.includes(p))
    return hits.length ? { key: r.key, label: r.label, level: r.level, score: Math.min(99, base + hits.length * 4), hits, evidence: evidence(text, hits) } : null
  }).filter(Boolean).sort((a, b) => b!.score - a!.score) as PsychiatrySignal[]
}

export function scanPsychiatryContext(messagesOrText: unknown) {
  const text = Array.isArray(messagesOrText)
    ? messagesOrText.map((m: any) => `${m.role || 'message'}: ${m.content || m.text || ''}`).join('\n')
    : clean(messagesOrText)
  const primarySignals = detect(text, primary, 82)
  const secondarySignals = detect(text, secondary as typeof primary, 66)
  let risk_level: 'critical' | 'high' | 'elevated' | 'routine' = 'routine'
  if (primarySignals.some((x) => x.level === 'critical')) risk_level = 'critical'
  else if (primarySignals.length) risk_level = 'high'
  else if (secondarySignals.length) risk_level = 'elevated'
  const prompt_context = [
    '[BACKGROUND PSYCHIATRY/DBT SCANNER CONTEXT]',
    `Risk level: ${risk_level}`,
    'Use trauma-sensitive, disability-aware, low-shame support. Do not diagnose; phrase inferences as uncertain.',
    ...primarySignals.slice(0, 6).map((x) => `Primary: ${x.label} (${x.score}%): ${x.evidence}`),
    ...secondarySignals.slice(0, 8).map((x) => `Secondary: ${x.label} (${x.score}%): ${x.evidence}`),
    secondarySignals.some((x) => x.key === 'adhd_exec') ? 'ADHD support: split into one visible next action; avoid willpower language.' : '',
    secondarySignals.some((x) => x.key === 'shame') ? 'Shame support: validate pain without agreeing with self-attack.' : '',
    secondarySignals.some((x) => x.key === 'pain_mobility') ? 'Disability support: offer seated, low-energy, or aided alternatives.' : '',
  ].filter(Boolean).join('\n')
  return { schema: 'sidejot-psychiatry-background-report-v1', createdAt: new Date().toISOString(), risk_level, layers: { primary: primarySignals, secondary: secondarySignals }, prompt_context }
}

export function appendPsychiatrySystemMessage(messages: any[]) {
  const report = scanPsychiatryContext(messages)
  return { report, messages: [...messages, { role: 'system', content: report.prompt_context }] }
}
