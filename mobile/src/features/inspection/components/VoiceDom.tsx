'use dom'

import React, { useState } from 'react'

export default function VoiceDom({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false)

  const handleToggle = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition tidak didukung di perangkat ini')
      return
    }

    const rec = new SpeechRecognition()
    rec.lang = 'id-ID'
    rec.interimResults = false
    rec.onstart = () => setIsRecording(true)
    rec.onend = () => setIsRecording(false)
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      if (text) onTranscript(text)
    }
    rec.onerror = () => setIsRecording(false)
    rec.start()
  }

  return (
    <button
      onClick={handleToggle}
      style={{
        backgroundColor: isRecording ? '#EF4444' : '#0284C7',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 12px',
        fontSize: '12px',
        cursor: 'pointer',
      }}
    >
      {isRecording ? 'Mendengarkan...' : '🎙️ Rekam Voice'}
    </button>
  )
}
