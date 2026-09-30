import { useState, useEffect, useRef, useCallback } from 'react'

// Deklarasi tipe Web Speech API jika belum tersedia di lib DOM standar
export interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

export interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

export interface SpeechRecognitionResult {
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

export interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

export interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onaudiostart?: ((this: ISpeechRecognition, ev: Event) => any) | null
  onsoundstart?: ((this: ISpeechRecognition, ev: Event) => any) | null
  onspeechstart?: ((this: ISpeechRecognition, ev: Event) => any) | null
  onspeechend?: ((this: ISpeechRecognition, ev: Event) => any) | null
  onsoundend?: ((this: ISpeechRecognition, ev: Event) => any) | null
  onaudioend?: ((this: ISpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionConstructor {
  new (): ISpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export interface UseVoiceRecognitionOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const {
    lang = 'id-ID',
    continuous = false, // Single command turn-taking: Chrome langsung memproses begitu selesai bicara
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options

  const [isSupported, setIsSupported] = useState(() => {
    return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  })
  const [isListening, setIsListening] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isSoundDetected, setIsSoundDetected] = useState(false)
  const [micVolume, setMicVolume] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [currentLang, setCurrentLang] = useState(lang)

  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  const onEndRef = useRef(onEnd)
  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
    onEndRef.current = onEnd
  })

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const isManuallyStoppedRef = useRef(false)
  const hasErrorRef = useRef(false)
  const latestInterimRef = useRef('')
  const volumeAnimRef = useRef<number | null>(null)

  // Cek apakah origin insecure (HTTP selain localhost)
  const isInsecureOrigin =
    typeof window !== 'undefined' &&
    !window.isSecureContext &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'

  // Periksa dukungan SpeechRecognition pada browser
  useEffect(() => {
    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined

    setIsSupported(Boolean(SpeechRecognitionClass))

    return () => {
      if (volumeAnimRef.current) {
        cancelAnimationFrame(volumeAnimRef.current)
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
        recognitionRef.current = null
      }
    }
  }, [])

  // Animasi sinyal suara halus saat terdeteksi suara
  useEffect(() => {
    if (isSoundDetected || interimTranscript) {
      let phase = 0
      const animateVolume = () => {
        phase += 0.2
        const dynamicVol = Math.round(45 + Math.sin(phase) * 35)
        setMicVolume(dynamicVol)
        volumeAnimRef.current = requestAnimationFrame(animateVolume)
      }
      volumeAnimRef.current = requestAnimationFrame(animateVolume)
    } else {
      if (volumeAnimRef.current) {
        cancelAnimationFrame(volumeAnimRef.current)
        volumeAnimRef.current = null
      }
      setMicVolume(0)
    }

    return () => {
      if (volumeAnimRef.current) {
        cancelAnimationFrame(volumeAnimRef.current)
        volumeAnimRef.current = null
      }
    }
  }, [isSoundDetected, interimTranscript])

  // Fungsi untuk memulai pengenalan suara (bebas konflik getUserMedia)
  const startListening = useCallback(
    (customLang?: string) => {
      const activeLang = customLang || currentLang
      if (customLang) setCurrentLang(customLang)

      const SpeechRecognitionClass =
        typeof window !== 'undefined'
          ? window.SpeechRecognition || window.webkitSpeechRecognition
          : undefined

      if (!SpeechRecognitionClass) {
        setError('SPEECH_NOT_SUPPORTED')
        onError?.('SPEECH_NOT_SUPPORTED')
        return
      }

      try {
        // 1. Bersihkan instance lama jika sedang aktif (lepaskan semua event handlers agar tidak memicu onend zombie)
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onstart = null
            if ('onaudiostart' in recognitionRef.current) recognitionRef.current.onaudiostart = null
            if ('onsoundstart' in recognitionRef.current) recognitionRef.current.onsoundstart = null
            if ('onspeechstart' in recognitionRef.current) recognitionRef.current.onspeechstart = null
            if ('onspeechend' in recognitionRef.current) recognitionRef.current.onspeechend = null
            if ('onsoundend' in recognitionRef.current) recognitionRef.current.onsoundend = null
            if ('onaudioend' in recognitionRef.current) recognitionRef.current.onaudioend = null
            recognitionRef.current.onresult = null
            recognitionRef.current.onerror = null
            recognitionRef.current.onend = null
            recognitionRef.current.abort()
          } catch {
            // ignore
          }
          recognitionRef.current = null
        }

        // 2. Berikan feedback visual instan ke UI
        setIsStarting(true)
        setError(null)
        setTranscript('')
        setInterimTranscript('')
        setIsSoundDetected(false)
        latestInterimRef.current = ''
        isManuallyStoppedRef.current = false
        hasErrorRef.current = false

        // 3. Buat instance BARU untuk sesi ini
        const instance = new SpeechRecognitionClass()
        instance.continuous = continuous
        instance.interimResults = interimResults
        instance.lang = activeLang
        instance.maxAlternatives = 1

        instance.onstart = () => {
          setIsStarting(false)
          setIsListening(true)
          setError(null)
        }

        instance.onaudiostart = () => {
          setIsStarting(false)
          setIsListening(true)
        }

        instance.onsoundstart = () => {
          setIsSoundDetected(true)
        }

        instance.onspeechstart = () => {
          setIsSoundDetected(true)
        }

        instance.onspeechend = () => {
          setIsSoundDetected(false)
        }

        instance.onsoundend = () => {
          setIsSoundDetected(false)
        }

        instance.onaudioend = () => {
          setIsSoundDetected(false)
        }

        instance.onresult = (event: SpeechRecognitionEvent) => {
          setIsSoundDetected(true)
          let finalStr = ''
          let interimStr = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalStr += result[0].transcript
            } else {
              interimStr += result[0].transcript
            }
          }

          if (finalStr) {
            latestInterimRef.current = ''
            setTranscript((prev) => {
              const updated = (prev ? `${prev} ` : '') + finalStr.trim()
              onResultRef.current?.(updated, true)
              return updated
            })
            setInterimTranscript('')
          } else if (interimStr) {
            latestInterimRef.current = interimStr
            setInterimTranscript(interimStr)
            onResultRef.current?.(interimStr, false)
          }
        }

        instance.onerror = (event: SpeechRecognitionErrorEvent) => {
          // 'no-speech' terjadi saat hening atau jeda bicara biasa
          if (event.error === 'no-speech') {
            setIsSoundDetected(false)
            return
          }

          // 'aborted' dipicu saat stop/restart normal, bukan error
          if (event.error === 'aborted') {
            return
          }

          hasErrorRef.current = true
          setIsStarting(false)
          setIsListening(false)
          setIsSoundDetected(false)
          setError(event.error)
          onErrorRef.current?.(event.error)
        }

        instance.onend = () => {
          // Salvage interim text HANYA jika bukan dihentikan secara manual (normal timeout turn-taking)
          if (latestInterimRef.current && !isManuallyStoppedRef.current) {
            const fallbackText = latestInterimRef.current.trim()
            latestInterimRef.current = ''
            setTranscript((prev) => {
              const updated = (prev ? `${prev} ` : '') + fallbackText
              onResultRef.current?.(updated, true)
              return updated
            })
            setInterimTranscript('')
          } else {
            latestInterimRef.current = ''
          }

          setIsStarting(false)
          setIsListening(false)
          setIsSoundDetected(false)
          recognitionRef.current = null

          // Panggil onEnd untuk consumer
          onEndRef.current?.()
        }

        recognitionRef.current = instance
        instance.start()
      } catch (err: any) {
        hasErrorRef.current = true
        setIsStarting(false)
        setIsListening(false)
        setIsSoundDetected(false)
        const errMsg = err?.message || 'START_FAILED'
        setError(errMsg)
        onErrorRef.current?.(errMsg)
      }
    },
    [currentLang, continuous, interimResults]
  )

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true
    setIsStarting(false)
    setIsSoundDetected(false)
    latestInterimRef.current = ''
    setInterimTranscript('')

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
    }
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    latestInterimRef.current = ''
    setIsSoundDetected(false)
    setError(null)
  }, [])

  const testHardwareMic = useCallback(async (): Promise<{
    isAvailable: boolean
    deviceName: string
    peakVolume: number
    hasAudioSignal: boolean
    signalStrength?: 'GOOD' | 'WEAK' | 'NONE'
    error?: string
  }> => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        isAvailable: false,
        deviceName: '',
        peakVolume: 0,
        hasAudioSignal: false,
        signalStrength: 'NONE',
        error: 'MEDIA_DEVICES_NOT_SUPPORTED',
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const track = stream.getAudioTracks()[0]
      const deviceName = track?.label || 'Microphone Default'

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContextClass()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let maxVol = 0

      // Sample volume selama 1.5 detik
      const startTime = Date.now()
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const avg = sum / dataArray.length
          const volPercent = Math.min(100, Math.round((avg / 128) * 100))
          if (volPercent > maxVol) maxVol = volPercent

          if (Date.now() - startTime >= 1500) {
            clearInterval(interval)
            resolve()
          }
        }, 50)
      })

      // Bersihkan media tracks dan AudioContext
      stream.getTracks().forEach((t) => t.stop())
      await ctx.close().catch(() => {})

      const signalStrength: 'GOOD' | 'WEAK' | 'NONE' =
        maxVol >= 18 ? 'GOOD' : maxVol >= 4 ? 'WEAK' : 'NONE'

      return {
        isAvailable: true,
        deviceName,
        peakVolume: maxVol,
        hasAudioSignal: maxVol >= 18,
        signalStrength,
      }
    } catch (err: any) {
      return {
        isAvailable: false,
        deviceName: '',
        peakVolume: 0,
        hasAudioSignal: false,
        error: err?.name || err?.message || 'PERMISSION_DENIED',
      }
    }
  }, [])

  return {
    isSupported,
    isListening,
    isStarting,
    isSoundDetected,
    micVolume,
    isInsecureOrigin,
    currentLang,
    setCurrentLang,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    testHardwareMic,
  }
}
