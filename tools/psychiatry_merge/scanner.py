"""
Unified passive psychiatry/DBT/ADHD/health-behavior scanner.

Purpose:
- Runs in the background before a chatbot response is generated.
- Preserves upstream chatbot functions by augmenting message context rather than deleting or replacing source logic.
- Uses three layered systems:
  1. Primary: immediate safety, medical red flags, self-harm/violence risk language, severe dysregulation.
  2. Secondary: DBT skill direction, ADHD/executive-function support, trauma/attachment cues, shame, care gaps.
  3. Tertiary: longitudinal patterns, repeated blocks, care-plan references, accommodations, pacing, life-impact context.

This is support software for compassionate chat responses. It does not diagnose, prescribe, or certify medical/psychiatric status.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple
import json
import re


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean(text: Any) -> str:
    if text is None:
        return ""
    text = str(text)
    text = re.sub(r"<script[\s\S]*?</script>", " ", text, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _tokens(text: Any) -> List[str]:
    stop = {
        'the','and','that','with','have','this','from','for','you','your','are','was','were','they','them','then','than','into','about','because','just','like','what','when','where','there','their','will','would','could','should','not','but','all','can','cant','cannot','its','ive','im','ill','had','has','been','being','our','out','off','over','under','very','more','less','too','also','use','using','need','needs'
    }
    raw = re.sub(r"[^a-zA-Z0-9'\-\s]", " ", _clean(text).lower()).split()
    out=[]
    for t in raw:
        t=t.strip("'")
        if len(t) < 3 or t in stop:
            continue
        out.append(t)
    return out


def _evidence(text: str, phrases: Sequence[str], pad: int = 95) -> str:
    cleaned=_clean(text)
    low=cleaned.lower()
    for phrase in phrases:
        idx=low.find(str(phrase).lower())
        if idx >= 0:
            return cleaned[max(0, idx-pad): min(len(cleaned), idx+len(phrase)+pad)]
    parts = re.findall(r"[^.!?]+[.!?]*", cleaned)
    return (parts[0] if parts else cleaned)[:300]


@dataclass
class ReferenceChunk:
    title: str
    source: str
    path: str
    text: str
    tokens: Dict[str, int] = field(default_factory=dict)


class UnifiedPsychiatryScanner:
    """Layered background scanner for psychiatry-informed chatbot support."""

    PRIMARY_RULES: List[Dict[str, Any]] = [
        {
            'key': 'immediate_self_harm_or_suicide_language', 'layer': 'primary', 'level': 'critical', 'score': 98,
            'label': 'Immediate self-harm / suicide language',
            'phrases': ['kill myself','suicide','suicidal','want to die','end my life','no reason to live','overdose','cut myself','cutting myself','hurt myself','self harm','self-harm','not safe with myself','cannot stay safe','can’t stay safe'],
            'support': ['Prioritize immediate safety, reduce access to means if possible, stay connected to safe people, and use local emergency/crisis resources if danger is present.']
        },
        {
            'key': 'harm_to_others_language', 'layer': 'primary', 'level': 'critical', 'score': 94,
            'label': 'Potential harm-to-others language',
            'phrases': ['hurt someone','kill someone','harm someone','make them pay','violent urges','i might attack','i will attack'],
            'support': ['Keep the response calm, direct, and safety-focused; encourage distance from weapons/targets and urgent human support.']
        },
        {
            'key': 'medical_red_flag_language', 'layer': 'primary', 'level': 'critical', 'score': 92,
            'label': 'Possible urgent medical red flag',
            'phrases': ['chest pain','trouble breathing','can’t breathe','cannot breathe','fainting','seizure','stroke','blue lips','anaphylaxis','severe allergic','oxygen dropped','worst headache','new weakness','loss of consciousness'],
            'support': ['Use urgent/emergency medical support language before ordinary coping guidance.']
        },
        {
            'key': 'acute_dysregulation', 'layer': 'primary', 'level': 'high', 'score': 84,
            'label': 'Acute emotional dysregulation / panic / spiral',
            'phrases': ['spiraling','panic attack','meltdown','shutdown','freaking out','cannot calm down','can’t calm down','overwhelmed','too much','rage','exploded','dissociating','dissociated','numb and unreal'],
            'support': ['Start with validation, grounding, pacing, sensory reduction, and one tiny next step.']
        },
    ]

    SECONDARY_RULES: List[Dict[str, Any]] = [
        {
            'key': 'basic_care_blocked', 'layer': 'secondary', 'level': 'medium', 'score': 76,
            'label': 'Basic self-care may be blocked',
            'phrases': ['haven’t showered','havent showered','not showered','cannot shower','can’t shower','haven’t eaten','havent eaten','forgot to eat','not eating','not drinking','dehydrated','brushing teeth is hard','cannot cook','can’t cook','dirty clothes','cant get out of bed','can’t get out of bed'],
            'dbt': ['PLEASE skills', 'opposite action to shame', 'tiny-step behavioral activation'],
            'support': ['Treat care gaps as blocked access/energy/executive function, not laziness.']
        },
        {
            'key': 'adhd_executive_function', 'layer': 'secondary', 'level': 'medium', 'score': 73,
            'label': 'ADHD / executive-function support need',
            'phrases': ['can’t start','cannot start','too many steps','lost track of time','forgot','forgotten','doom scrolling','stuck','freeze','frozen','task feels impossible','where do i start','decision paralysis','executive dysfunction'],
            'dbt': ['missing-links analysis', 'one-step task split', 'external cue / body-double prompt'],
            'support': ['Use concrete one-action prompts, not motivation or willpower language.']
        },
        {
            'key': 'shame_self_attack', 'layer': 'secondary', 'level': 'medium', 'score': 74,
            'label': 'Shame / self-attack cue',
            'phrases': ['i’m useless','im useless','worthless','lazy','failure','bad person','hate myself','gross','burden','pathetic','stupid','i ruin everything','my fault','i deserve it'],
            'dbt': ['self-validation', 'nonjudgmental stance', 'opposite action to shame'],
            'support': ['Validate pain without confirming the self-attack. Reframe toward needs, stressors, and care.']
        },
        {
            'key': 'rejection_abandonment_attachment', 'layer': 'secondary', 'level': 'medium', 'score': 72,
            'label': 'Rejection / abandonment / attachment cue',
            'phrases': ['they hate me','abandoned','leave me','rejected','ignored me','no one cares','too needy','clingy','people always leave','are you mad at me','they are mad at me','replace me'],
            'dbt': ['check the facts', 'GIVE', 'FAST', 'DEAR MAN', 'attachment-sensitive validation'],
            'support': ['Validate the threat feeling first, then gently check facts and offer a safe communication script.']
        },
        {
            'key': 'trauma_grief_trigger', 'layer': 'secondary', 'level': 'medium', 'score': 71,
            'label': 'Trauma / grief / trigger cue',
            'phrases': ['triggered','flashback','nightmare','trauma','cptsd','c-ptsd','ptsd','grief','died','death','loss','hospitalized','abuse','assault','unsafe','scared of being hurt'],
            'dbt': ['grounding', 'orienting to present safety', 'self-soothe', 'radical acceptance when appropriate'],
            'support': ['Lead with safety/orientation, choice, and control. Avoid pressure to narrate trauma details.']
        },
        {
            'key': 'mobility_pain_fatigue_access', 'layer': 'secondary', 'level': 'medium', 'score': 70,
            'label': 'Mobility / pain / fatigue / access barrier',
            'phrases': ['wheelchair','walker','cane','shower chair','power chair','manual wheelchair','mobility aid','stairs','fall','fell','pain flare','fatigue','exhausted','bedridden','can barely walk','eds','ehlers','ms flare','oxygen','pacing','spoons'],
            'dbt': ['pacing', 'accommodation planning', 'PLEASE skills with disability-aware modifications'],
            'support': ['Offer accommodations and seated/low-energy alternatives. Do not treat physical limits as avoidance.']
        },
    ]

    TERTIARY_RULES: List[Dict[str, Any]] = [
        {
            'key': 'masked_distress', 'layer': 'tertiary', 'level': 'low', 'score': 62,
            'label': 'Possible masked distress / minimizing',
            'phrases': ['i’m fine','im fine','it’s fine','its fine','whatever','doesn’t matter','doesnt matter','not a big deal','i guess','probably my fault'],
            'support': ['Treat as uncertain. Ask gently and give control: “part of you may be trying to minimize this; want tiny help or just company?”']
        },
        {
            'key': 'caregiver_or_support_context', 'layer': 'tertiary', 'level': 'low', 'score': 58,
            'label': 'Caregiver / support-person context',
            'phrases': ['caregiver','fiancé','fiance','partner helps','support person','advocate','ask for help','needs help with','care plan'],
            'support': ['Consider scripts, shared task handoff, consent, and clear requests.']
        },
    ]

    def __init__(self, data_dir: Optional[str | Path] = None, max_reference_chars: int = 900) -> None:
        self.data_dir = Path(data_dir) if data_dir else Path(__file__).resolve().parents[2] / 'json'
        self.max_reference_chars = max_reference_chars
        self.references: List[ReferenceChunk] = []
        self.load_reference_data()

    def load_reference_data(self) -> int:
        self.references.clear()
        if not self.data_dir.exists():
            return 0
        for path in sorted(self.data_dir.rglob('*.json')):
            try:
                payload=json.loads(path.read_text(encoding='utf-8', errors='ignore'))
            except Exception:
                continue
            for title, text in self._flatten_json(payload, path.name):
                clean=_clean(text)
                if len(clean) < 30:
                    continue
                self.references.append(ReferenceChunk(title=title[:180], source=path.name, path=str(path.relative_to(self.data_dir)), text=clean[:self.max_reference_chars], tokens=self._token_counts(clean)))
        return len(self.references)

    def _flatten_json(self, value: Any, default_title: str, prefix: str = '') -> Iterable[Tuple[str, str]]:
        if isinstance(value, dict):
            name = str(value.get('name') or value.get('title') or value.get('title_full') or value.get('id') or prefix or default_title)
            textual=[]
            for k,v in value.items():
                if isinstance(v, (str, int, float)):
                    textual.append(f"{k}: {v}")
                elif isinstance(v, list) and all(not isinstance(x, (dict, list)) for x in v[:20]):
                    textual.append(f"{k}: {'; '.join(map(str, v[:50]))}")
            if textual:
                yield name, '\n'.join(textual)
            for k,v in value.items():
                if isinstance(v, (dict, list)):
                    yield from self._flatten_json(v, default_title, f"{name} / {k}")
        elif isinstance(value, list):
            for idx, item in enumerate(value):
                yield from self._flatten_json(item, default_title, f"{prefix} #{idx+1}")

    @staticmethod
    def _token_counts(text: str) -> Dict[str, int]:
        out: Dict[str,int]={}
        for t in _tokens(text):
            out[t]=out.get(t,0)+1
        return out

    def _detect(self, text: str, rules: Sequence[Dict[str, Any]], threshold: int) -> List[Dict[str, Any]]:
        low=_clean(text).lower()
        hits=[]
        for rule in rules:
            matched=[p for p in rule.get('phrases', []) if str(p).lower() in low]
            if not matched:
                continue
            score=min(99, int(rule.get('score', 50)) + max(0, len(matched)-1)*4)
            if score < threshold:
                continue
            hits.append({
                'key': rule['key'], 'layer': rule['layer'], 'level': rule['level'], 'label': rule['label'],
                'score': score, 'matched_phrases': matched, 'evidence': _evidence(text, matched),
                'support': rule.get('support', []), 'dbt': rule.get('dbt', [])
            })
        hits.sort(key=lambda x: x['score'], reverse=True)
        return hits

    def _infer(self, text: str, primary: List[Dict[str, Any]], secondary: List[Dict[str, Any]], threshold: int) -> List[Dict[str, Any]]:
        keys={h['key'] for h in primary+secondary}
        low=_clean(text).lower()
        out=[]
        def any_phrase(items: Sequence[str]) -> bool:
            return any(i in low for i in items)
        def add(label: str, score: int, rationale: str, support: str) -> None:
            if score >= threshold:
                out.append({'label': label, 'layer': 'tertiary', 'level': 'inferred', 'score': score, 'rationale': rationale, 'support': support})
        if 'basic_care_blocked' in keys and 'shame_self_attack' in keys:
            add('Care gaps may be mixed with shame', 78, 'Care-blocking phrases and self-attack phrases appear together.', 'Use shame-free practical support and one very small care step.')
        if 'mobility_pain_fatigue_access' in keys and any_phrase(['lazy','failure','supposed to','should be able']):
            add('Physical limits may be getting interpreted as laziness', 76, 'Mobility/pain/fatigue language appears near pressure or self-blame language.', 'Offer disability-aware accommodations and pacing.')
        if 'acute_dysregulation' in keys and 'rejection_abandonment_attachment' in keys:
            add('Attachment-sensitive validation likely needs to come before problem-solving', 75, 'Overload and abandonment/rejection cues overlap.', 'Validate fear of loss first; then gently check facts and offer a script.')
        if 'adhd_executive_function' in keys and any_phrase(['appointment','email','clean','shower','eat','task','schedule','plan']):
            add('Executive-function scaffolding may help more than reassurance alone', 70, 'Task terms appear with start/forget/time/freeze language.', 'Split into first visible action, reduce choices, and offer a timer/body-double option.')
        return sorted(out, key=lambda x: x['score'], reverse=True)

    def search_references(self, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        q=_tokens(query)
        if not q:
            return []
        unique=list(dict.fromkeys(q))
        scored=[]
        for ref in self.references:
            score=0
            matches=[]
            for t in unique:
                c=ref.tokens.get(t,0)
                if c:
                    score += min(8, 2+c)
                    matches.append(t)
            if score:
                # title boost
                title_tokens=set(_tokens(ref.title))
                score += sum(3 for t in unique if t in title_tokens)
                scored.append((score, ref, matches))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {'title': r.title, 'source': r.source, 'path': r.path, 'score': s, 'matched_tokens': m[:16], 'text': r.text}
            for s,r,m in scored[:limit]
        ]

    def analyze_text(self, text: str, context_messages: Optional[Sequence[Dict[str, Any]]] = None, threshold: int = 55) -> Dict[str, Any]:
        conversation = _clean(text)
        if context_messages:
            prior = '\n'.join(f"{m.get('role') or m.get('speaker') or 'message'}: {m.get('content') or m.get('text') or ''}" for m in context_messages[-12:])
            combined = _clean(prior + '\n' + conversation)
        else:
            combined = conversation
        primary=self._detect(combined, self.PRIMARY_RULES, max(40, threshold))
        secondary=self._detect(combined, self.SECONDARY_RULES, max(35, threshold-5))
        tertiary=self._detect(combined, self.TERTIARY_RULES, max(30, threshold-10))
        inferred=self._infer(combined, primary, secondary, max(35, threshold-5))
        query_parts=[combined]
        for hit in primary+secondary+tertiary:
            query_parts.append(hit.get('label',''))
            query_parts.extend(hit.get('matched_phrases', []))
            query_parts.extend(hit.get('dbt', []))
            query_parts.extend(hit.get('support', []))
        for item in inferred:
            query_parts.append(item.get('support',''))
        references=self.search_references(' '.join(query_parts), limit=10)
        risk='routine'
        if any(h['level']=='critical' for h in primary): risk='critical'
        elif any(h['level']=='high' for h in primary): risk='high'
        elif secondary: risk='elevated'
        report={
            'schema': 'unified-psychiatry-background-report-v1',
            'createdAt': _now(),
            'risk_level': risk,
            'layers': {'primary': primary, 'secondary': secondary, 'tertiary': tertiary, 'inferred': inferred},
            'references': references,
            'support_plan': self._support_plan(primary, secondary, tertiary, inferred),
            'conversationPreview': conversation[:900],
        }
        report['prompt_context'] = self.build_prompt_context(report)
        return report

    def analyze_messages(self, messages: Sequence[Dict[str, Any]], threshold: int = 55) -> Dict[str, Any]:
        text='\n'.join(f"{m.get('role') or m.get('speaker') or 'message'}: {m.get('content') or m.get('text') or ''}" for m in messages)
        return self.analyze_text(text, threshold=threshold)

    def _support_plan(self, primary: List[Dict[str, Any]], secondary: List[Dict[str, Any]], tertiary: List[Dict[str, Any]], inferred: List[Dict[str, Any]]) -> List[str]:
        plan=[]
        if any(h['level']=='critical' for h in primary):
            plan.append('Start with immediate safety and connection to urgent human support if there is present danger.')
        if any(h['key']=='acute_dysregulation' for h in primary):
            plan.append('Use grounding first: slow down, orient to now, reduce sensory load, one tiny next step.')
        for hit in secondary:
            for s in hit.get('support', []):
                if s not in plan: plan.append(s)
            for d in hit.get('dbt', []):
                item=f'DBT direction: {d}'
                if item not in plan: plan.append(item)
        for hit in inferred:
            s=hit.get('support')
            if s and s not in plan: plan.append(s)
        if not plan:
            plan.append('Use warm validation, ask one gentle question, and offer one practical next step.')
        return plan[:9]

    def build_prompt_context(self, report: Dict[str, Any]) -> str:
        lines=[
            '[BACKGROUND PSYCHIATRY/DBT SCANNER CONTEXT — not user-visible unless useful]',
            f"Risk level: {report.get('risk_level','routine')}",
            'Use trauma-sensitive, disability-aware, low-shame support. Do not diagnose or claim certainty. The scanner is assistive context for the bot response.',
        ]
        for layer_name in ['primary','secondary','tertiary','inferred']:
            items=report.get('layers',{}).get(layer_name, [])
            if items:
                lines.append(f"{layer_name.title()} signals:")
                for item in items[:6]:
                    label=item.get('label') or item.get('key')
                    score=item.get('score')
                    evidence=item.get('evidence') or item.get('rationale') or ''
                    lines.append(f"- {label} ({score}%): {evidence[:220]}")
        if report.get('support_plan'):
            lines.append('Support plan:')
            for p in report['support_plan']:
                lines.append(f"- {p}")
        if report.get('references'):
            lines.append('Reference hints:')
            for idx, ref in enumerate(report['references'][:5], 1):
                lines.append(f"[{idx}] {ref['title']} / {ref['source']}: {ref['text'][:260]}")
        return '\n'.join(lines)

    def build_augmented_message(self, message: str, report: Optional[Dict[str, Any]] = None) -> str:
        report = report or self.analyze_text(message)
        # Preserve original user text and append scanner context for underlying model/code.
        return f"{message}\n\n{report['prompt_context']}"

    def enrich_response(self, response: str, report: Dict[str, Any]) -> str:
        """Optionally add safety/context language while preserving upstream bot response."""
        response = str(response or '').strip()
        risk = report.get('risk_level')
        if risk == 'critical':
            prefix = (
                "I’m really glad you said something. Before we problem-solve, safety comes first: "
                "please stay near a safe person if you can, move away from anything you could use to hurt yourself or someone else, "
                "and use local emergency/crisis support right now if there is immediate danger.\n\n"
            )
            if not response.lower().startswith("i’m really glad") and not response.lower().startswith("i'm really glad"):
                return prefix + response
        if risk == 'high' and 'ground' not in response.lower():
            suffix = "\n\nTiny grounding step: name one thing you can see, one thing touching your body, and one next safe action."
            return response + suffix
        return response


_DEFAULT: Optional[UnifiedPsychiatryScanner] = None


def get_default_scanner() -> UnifiedPsychiatryScanner:
    global _DEFAULT
    if _DEFAULT is None:
        _DEFAULT = UnifiedPsychiatryScanner()
    return _DEFAULT


def scan_text(text: str, threshold: int = 55) -> Dict[str, Any]:
    return get_default_scanner().analyze_text(text, threshold=threshold)


def analyze_messages(messages: Sequence[Dict[str, Any]], threshold: int = 55) -> Dict[str, Any]:
    return get_default_scanner().analyze_messages(messages, threshold=threshold)
