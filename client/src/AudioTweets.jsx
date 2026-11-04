import { useEffect, useRef, useState } from 'react'

const API_BASE = 'http://localhost:5000/api'
const MAX_SIZE = 100 * 1024 * 1024
const MAX_DURATION = 300

function isUploadTimeAllowed() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  return hour >= 14 && hour < 19
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function AudioTweets({ token }) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [file, setFile] = useState(null)
  const [fileDuration, setFileDuration] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [audioTweets, setAudioTweets] = useState([])

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const secondsRef = useRef(0)
  const previewUrlRef = useRef('')

  const headers = {
    Authorization: `Bearer ${token}`,
  }

  function clearPreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }
    setPreviewUrl('')
  }

  function resetSelection() {
    clearPreview()
    setFile(null)
    setFileDuration(0)
    setDuration(0)
    secondsRef.current = 0
  }

  useEffect(() => {
    loadAudioTweets()

    return () => {
      clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [token])

  async function loadAudioTweets() {
    try {
      const response = await fetch(`${API_BASE}/audio`, {
        headers,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not load audio tweets')
      }

      setAudioTweets(
        Array.isArray(data.audioTweets)
          ? data.audioTweets
          : Array.isArray(data.audios)
            ? data.audios
            : []
      )
    } catch (err) {
      setError(err.message)
    }
  }

  async function startRecording() {
    setError('')
    setMessage('')

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Audio recording is not supported in this browser.')
      return
    }

    try {
      resetSelection()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })

      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })

        if (blob.size > MAX_SIZE) {
          setError('Audio file cannot exceed 100 MB.')
          return
        }

        const audioFile = new File(
          [blob],
          `audio-tweet-${Date.now()}.webm`,
          { type: blob.type }
        )

        setFile(audioFile)
        setFileDuration(Math.max(1, secondsRef.current))
        clearPreview()

        const url = URL.createObjectURL(blob)
        previewUrlRef.current = url
        setPreviewUrl(url)
      }

      recorder.start()
      secondsRef.current = 0
      setDuration(0)
      setRecording(true)

      timerRef.current = setInterval(() => {
        secondsRef.current += 1
        setDuration(secondsRef.current)

        if (secondsRef.current >= MAX_DURATION) {
          stopRecording()
        }
      }, 1000)
    } catch (err) {
      setError(err.message || 'Microphone permission is required.')
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)

    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setRecording(false)
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''

    if (!selectedFile) return

    setError('')
    setMessage('')

    if (selectedFile.size > MAX_SIZE) {
      setError('Audio file cannot exceed 100 MB.')
      return
    }

    if (!selectedFile.type.startsWith('audio/')) {
      setError('Please select a valid audio file.')
      return
    }

    clearPreview()

    const url = URL.createObjectURL(selectedFile)
    previewUrlRef.current = url

    const audio = new Audio()
    audio.preload = 'metadata'
    audio.src = url

    audio.onloadedmetadata = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        setError('Could not read the audio duration.')
        clearPreview()
        return
      }

      if (audio.duration > MAX_DURATION) {
        setError('Audio duration cannot exceed 5 minutes.')
        clearPreview()
        return
      }

      setFile(selectedFile)
      setFileDuration(Math.max(1, Math.ceil(audio.duration)))
      setDuration(Math.ceil(audio.duration))
      setPreviewUrl(url)
    }

    audio.onerror = () => {
      setError('Could not read this audio file.')
      clearPreview()
    }
  }

  async function requestOTP() {
    setError('')
    setMessage('')

    if (!file) {
      setError('Please record or select an audio file first.')
      return
    }

    if (!isUploadTimeAllowed()) {
      setError('Audio uploads are allowed only from 2 PM to 7 PM IST.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`${API_BASE}/audio/request-otp`, {
        method: 'POST',
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not send OTP')
      }

      setOtpSent(true)
      setMessage(data.message || 'OTP sent to your registered email.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function uploadAudio(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!file || !otp.trim()) {
      setError('Please select audio and enter the OTP.')
      return
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the valid 6-digit OTP.')
      return
    }

    if (!isUploadTimeAllowed()) {
      setError('Audio uploads are allowed only from 2 PM to 7 PM IST.')
      return
    }

    const actualDuration = fileDuration || duration

    if (!actualDuration || actualDuration > MAX_DURATION) {
      setError('Audio must be between 1 second and 5 minutes.')
      return
    }

    if (file.size > MAX_SIZE) {
      setError('Audio file cannot exceed 100 MB.')
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('audio', file)
      formData.append('otp', otp.trim())
      formData.append('durationSeconds', String(actualDuration))

      const response = await fetch(`${API_BASE}/audio`, {
        method: 'POST',
        headers,
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Audio upload failed')
      }

      setMessage(data.message || 'Audio tweet uploaded successfully.')
      setOtp('')
      setOtpSent(false)
      resetSelection()
      await loadAudioTweets()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={styles.card}>
      <h3 style={styles.heading}>🎙️ Audio Tweets</h3>
      <p style={styles.subtext}>
        Record or upload audio. Maximum 5 minutes and 100 MB.
      </p>

      <div style={styles.actions}>
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={loading}
            style={styles.button}
          >
            Start Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            style={styles.stopButton}
          >
            Stop Recording
          </button>
        )}

        <label style={styles.fileButton}>
          Choose Audio
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            hidden
          />
        </label>
      </div>

      {recording && (
        <p style={styles.recording}>
          <span>● Recording</span> {formatTime(duration)} / 05:00
        </p>
      )}

      {file && (
        <div style={styles.preview}>
          <p>
            **Selected:** {file.name}
          </p>
          <p>
            Duration: {formatTime(fileDuration)} | Size:{' '}
            {(file.size / (1024 * 1024)).toFixed(2)} MB
          </p>

          {previewUrl && (
            <audio
              controls
              src={previewUrl}
              style={{ width: '100%', marginTop: 8 }}
            />
          )}

          <button
            type="button"
            onClick={resetSelection}
            style={styles.clearButton}
          >
            Remove audio
          </button>
        </div>
      )}

      {!otpSent ? (
        <button
          type="button"
          onClick={requestOTP}
          disabled={!file || loading || recording}
          style={styles.button}
        >
          {loading ? 'Please wait...' : 'Send Email OTP'}
        </button>
      ) : (
        <form onSubmit={uploadAudio} style={styles.otpForm}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit email OTP"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, ''))
            }
            style={styles.input}
          />

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Uploading...' : 'Verify OTP & Upload'}
          </button>
        </form>
      )}

      {error && <p style={styles.error}>{error}</p>}
      {message && <p style={styles.success}>{message}</p>}

      <div style={styles.list}>
        <h4>Your Audio Tweets</h4>

        {audioTweets.length === 0 ? (
          <p style={styles.subtext}>No audio tweets uploaded yet.</p>
        ) : (
          audioTweets.map((audio) => (
            <div key={audio._id || audio.id} style={styles.audioItem}>
              <p>{audio.originalName || audio.fileName || 'Audio Tweet'}</p>
              <audio
                controls
                src={audio.audioUrl}
                style={{ width: '100%' }}
              />
              <small>
                {audio.durationSeconds
                  ? `${formatTime(audio.durationSeconds)}`
                  : ''}
              </small>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

const styles = {
  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    color: '#111827',
  },
  heading: {
    margin: '0 0 6px',
    fontSize: 19,
  },
  subtext: {
    color: '#6b7280',
    fontSize: 13,
    margin: '6px 0 14px',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  button: {
    border: 0,
    borderRadius: 8,
    padding: '10px 15px',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  stopButton: {
    border: 0,
    borderRadius: 8,
    padding: '10px 15px',
    background: '#dc2626',
    color: '#fff',
    cursor: 'pointer',
  },
  fileButton: {
    display: 'inline-block',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '10px 15px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  recording: {
    color: '#dc2626',
    fontWeight: 600,
  },
  preview: {
    background: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    margin: '12px 0',
    overflowWrap: 'anywhere',
  },
  clearButton: {
    marginTop: 10,
    border: 0,
    background: 'transparent',
    color: '#dc2626',
    cursor: 'pointer',
  },
  otpForm: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  input: {
    flex: '1 1 180px',
    minWidth: 0,
    padding: 10,
    border: '1px solid #d1d5db',
    borderRadius: 8,
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
  success: {
    color: '#15803d',
    fontSize: 13,
  },
  list: {
    borderTop: '1px solid #e5e7eb',
    marginTop: 18,
    paddingTop: 12,
  },
  audioItem: {
    background: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
}