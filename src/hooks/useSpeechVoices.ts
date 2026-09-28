import { useEffect, useState } from 'react'
import { isSpeechSupported } from '@/lib/utils/textToSpeech'

/**
 * الأصوات المتاحة فعلياً الآن في المتصفح/الجهاز (محلية من نظام التشغيل،
 * أو شبكية إن وفّرها المتصفح). Chrome يحمّل القائمة بشكل غير متزامن،
 * فتكون فارغة عند أول استدعاء ثم يصدر حدث voiceschanged عند جاهزيتها —
 * لذلك نشترك في الحدث بدل قراءة القائمة مرة واحدة فقط
 */
export function useSpeechVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (!isSpeechSupported()) return
    const synth = window.speechSynthesis
    const update = () => setVoices(typeof synth.getVoices === 'function' ? synth.getVoices() : [])
    update()
    synth.addEventListener?.('voiceschanged', update)
    return () => synth.removeEventListener?.('voiceschanged', update)
  }, [])

  return voices
}
