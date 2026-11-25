
import { useEffect, useRef, useState } from 'react'

const MAX_SIZE = 100 * 1024 * 1024
const MAX_DURATION = 300

const translations = {
  English: {
    heading: '🎙️ Audio Tweets',
    description: 'Record or upload audio. Maximum 5 minutes and 100 MB. Uploads are allowed only from 2 PM to 7 PM IST.',
    start: 'Start Recording',
    stop: 'Stop Recording',
    choose: 'Choose Audio',
    recording: 'Recording',
    selected: 'Selected:',
    duration: 'Duration:',
    size: 'Size:',
    remove: 'Remove audio',
    wait: 'Please wait...',
    sendOtp: 'Send Email OTP',
    otpPlaceholder: 'Enter 6-digit email OTP',
    uploading: 'Uploading...',
    verifyUpload: 'Verify OTP & Upload',
    audioList: 'Your Audio Tweets',
    empty: 'No audio tweets uploaded yet.',
    unsupported: 'Audio recording is not supported in this browser.',
    mic: 'Microphone permission is required.',
    maxSize: 'Audio file cannot exceed 100 MB.',
    invalidFile: 'Please select a valid audio file.',
    readDuration: 'Could not read the audio duration.',
    maxDuration: 'Audio duration cannot exceed 5 minutes.',
    readFile: 'Could not read this audio file.',
    selectFirst: 'Please record or select an audio file first.',
    time: 'Audio uploads are allowed only from 2 PM to 7 PM IST.',
    sendError: 'Could not send OTP.',
    selectOtp: 'Please select audio and enter the OTP.',
    invalidOtp: 'Enter the valid 6-digit OTP.',
    durationError: 'Audio must be between 1 second and 5 minutes.',
    uploadError: 'Audio upload failed.',
    success: 'Audio tweet uploaded successfully.',
    loadError: 'Could not load audio tweets.',
  },

  Hindi: {
    heading: '🎙️ ऑडियो ट्वीट',
    description: 'ऑडियो रिकॉर्ड करें या अपलोड करें। अधिकतम 5 मिनट और 100 MB। अपलोड केवल दोपहर 2 बजे से शाम 7 बजे तक उपलब्ध हैं।',
    start: 'रिकॉर्डिंग शुरू करें',
    stop: 'रिकॉर्डिंग बंद करें',
    choose: 'ऑडियो चुनें',
    recording: 'रिकॉर्डिंग हो रही है',
    selected: 'चुना गया:',
    duration: 'अवधि:',
    size: 'आकार:',
    remove: 'ऑडियो हटाएं',
    wait: 'कृपया प्रतीक्षा करें...',
    sendOtp: 'ईमेल OTP भेजें',
    otpPlaceholder: '6 अंकों का ईमेल OTP दर्ज करें',
    uploading: 'अपलोड हो रहा है...',
    verifyUpload: 'OTP सत्यापित करें और अपलोड करें',
    audioList: 'आपके ऑडियो ट्वीट',
    empty: 'अभी तक कोई ऑडियो ट्वीट अपलोड नहीं हुआ है।',
    unsupported: 'इस ब्राउज़र में ऑडियो रिकॉर्डिंग उपलब्ध नहीं है।',
    mic: 'माइक्रोफ़ोन की अनुमति आवश्यक है।',
    maxSize: 'ऑडियो फ़ाइल 100 MB से बड़ी नहीं हो सकती।',
    invalidFile: 'कृपया सही ऑडियो फ़ाइल चुनें।',
    readDuration: 'ऑडियो की अवधि पढ़ी नहीं जा सकी।',
    maxDuration: 'ऑडियो की अवधि 5 मिनट से अधिक नहीं हो सकती।',
    readFile: 'इस ऑडियो फ़ाइल को पढ़ा नहीं जा सका।',
    selectFirst: 'कृपया पहले ऑडियो रिकॉर्ड करें या फ़ाइल चुनें।',
    time: 'ऑडियो अपलोड केवल दोपहर 2 बजे से शाम 7 बजे तक उपलब्ध हैं।',
    sendError: 'OTP नहीं भेजा जा सका।',
    selectOtp: 'कृपया ऑडियो चुनें और OTP दर्ज करें।',
    invalidOtp: 'सही 6 अंकों का OTP दर्ज करें।',
    durationError: 'ऑडियो 1 सेकंड से 5 मिनट के बीच होना चाहिए।',
    uploadError: 'ऑडियो अपलोड नहीं हो सका।',
    success: 'ऑडियो ट्वीट सफलतापूर्वक अपलोड हो गया।',
    loadError: 'ऑडियो ट्वीट लोड नहीं हो सके।',
  },

  Spanish: {
    heading: '🎙️ Tweets de audio',
    description: 'Graba o sube audio. Máximo 5 minutos y 100 MB. Las cargas están disponibles de 2 PM a 7 PM IST.',
    start: 'Iniciar grabación',
    stop: 'Detener grabación',
    choose: 'Elegir audio',
    recording: 'Grabando',
    selected: 'Seleccionado:',
    duration: 'Duración:',
    size: 'Tamaño:',
    remove: 'Eliminar audio',
    wait: 'Espera...',
    sendOtp: 'Enviar OTP por correo',
    otpPlaceholder: 'Introduce el OTP de 6 dígitos',
    uploading: 'Subiendo...',
    verifyUpload: 'Verificar OTP y subir',
    audioList: 'Tus tweets de audio',
    empty: 'Todavía no hay tweets de audio.',
    unsupported: 'La grabación de audio no es compatible con este navegador.',
    mic: 'Se necesita permiso para usar el micrófono.',
    maxSize: 'El archivo de audio no puede superar los 100 MB.',
    invalidFile: 'Selecciona un archivo de audio válido.',
    readDuration: 'No se pudo leer la duración del audio.',
    maxDuration: 'El audio no puede durar más de 5 minutos.',
    readFile: 'No se pudo leer este archivo de audio.',
    selectFirst: 'Primero graba o selecciona un archivo de audio.',
    time: 'Las cargas de audio solo están permitidas de 2 PM a 7 PM IST.',
    sendError: 'No se pudo enviar el OTP.',
    selectOtp: 'Selecciona un audio e introduce el OTP.',
    invalidOtp: 'Introduce un OTP válido de 6 dígitos.',
    durationError: 'El audio debe durar entre 1 segundo y 5 minutos.',
    uploadError: 'Error al subir el audio.',
    success: 'Tweet de audio subido correctamente.',
    loadError: 'No se pudieron cargar los tweets de audio.',
  },

  Portuguese: {
    heading: '🎙️ Tweets de áudio',
    description: 'Grave ou envie áudio. Máximo de 5 minutos e 100 MB. Envios permitidos das 14h às 19h IST.',
    start: 'Iniciar gravação',
    stop: 'Parar gravação',
    choose: 'Escolher áudio',
    recording: 'Gravando',
    selected: 'Selecionado:',
    duration: 'Duração:',
    size: 'Tamanho:',
    remove: 'Remover áudio',
    wait: 'Aguarde...',
    sendOtp: 'Enviar OTP por e-mail',
    otpPlaceholder: 'Digite o OTP de 6 dígitos',
    uploading: 'Enviando...',
    verifyUpload: 'Verificar OTP e enviar',
    audioList: 'Seus tweets de áudio',
    empty: 'Nenhum tweet de áudio enviado ainda.',
    unsupported: 'A gravação de áudio não é compatível com este navegador.',
    mic: 'É necessária permissão para usar o microfone.',
    maxSize: 'O arquivo de áudio não pode exceder 100 MB.',
    invalidFile: 'Selecione um arquivo de áudio válido.',
    readDuration: 'Não foi possível ler a duração do áudio.',
    maxDuration: 'O áudio não pode exceder 5 minutos.',
    readFile: 'Não foi possível ler este arquivo de áudio.',
    selectFirst: 'Grave ou selecione um arquivo de áudio primeiro.',
    time: 'Os envios de áudio são permitidos apenas das 14h às 19h IST.',
    sendError: 'Não foi possível enviar o OTP.',
    selectOtp: 'Selecione o áudio e digite o OTP.',
    invalidOtp: 'Digite um OTP válido de 6 dígitos.',
    durationError: 'O áudio deve ter entre 1 segundo e 5 minutos.',
    uploadError: 'Falha ao enviar o áudio.',
    success: 'Tweet de áudio enviado com sucesso.',
    loadError: 'Não foi possível carregar os tweets de áudio.',
  },

  Chinese: {
    heading: '🎙️ 音频推文',
    description: '录制或上传音频。最长 5 分钟，最大 100 MB。仅允许在印度时间下午 2 点至 7 点上传。',
    start: '开始录音',
    stop: '停止录音',
    choose: '选择音频',
    recording: '正在录音',
    selected: '已选择：',
    duration: '时长：',
    size: '大小：',
    remove: '删除音频',
    wait: '请稍候...',
    sendOtp: '发送邮箱验证码',
    otpPlaceholder: '输入 6 位邮箱验证码',
    uploading: '正在上传...',
    verifyUpload: '验证验证码并上传',
    audioList: '你的音频推文',
    empty: '尚未上传任何音频推文。',
    unsupported: '此浏览器不支持音频录制。',
    mic: '需要麦克风权限。',
    maxSize: '音频文件不能超过 100 MB。',
    invalidFile: '请选择有效的音频文件。',
    readDuration: '无法读取音频时长。',
    maxDuration: '音频时长不能超过 5 分钟。',
    readFile: '无法读取此音频文件。',
    selectFirst: '请先录制或选择音频文件。',
    time: '仅允许在印度时间下午 2 点至 7 点上传音频。',
    sendError: '无法发送验证码。',
    selectOtp: '请选择音频并输入验证码。',
    invalidOtp: '请输入有效的 6 位验证码。',
    durationError: '音频时长必须在 1 秒至 5 分钟之间。',
    uploadError: '音频上传失败。',
    success: '音频推文上传成功。',
    loadError: '无法加载音频推文。',
  },

  French: {
    heading: '🎙️ Tweets audio',
    description: 'Enregistrez ou téléversez un audio. Maximum 5 minutes et 100 MB. Envoi autorisé de 14 h à 19 h IST.',
    start: 'Démarrer l’enregistrement',
    stop: 'Arrêter l’enregistrement',
    choose: 'Choisir un audio',
    recording: 'Enregistrement',
    selected: 'Sélectionné :',
    duration: 'Durée :',
    size: 'Taille :',
    remove: 'Supprimer l’audio',
    wait: 'Veuillez patienter...',
    sendOtp: 'Envoyer le code par e-mail',
    otpPlaceholder: 'Saisissez le code à 6 chiffres',
    uploading: 'Téléversement...',
    verifyUpload: 'Vérifier le code et téléverser',
    audioList: 'Vos tweets audio',
    empty: 'Aucun tweet audio téléversé pour le moment.',
    unsupported: 'L’enregistrement audio n’est pas pris en charge par ce navigateur.',
    mic: 'L’autorisation du microphone est nécessaire.',
    maxSize: 'Le fichier audio ne peut pas dépasser 100 MB.',
    invalidFile: 'Veuillez sélectionner un fichier audio valide.',
    readDuration: 'Impossible de lire la durée de l’audio.',
    maxDuration: 'La durée audio ne peut pas dépasser 5 minutes.',
    readFile: 'Impossible de lire ce fichier audio.',
    selectFirst: 'Veuillez d’abord enregistrer ou sélectionner un fichier audio.',
    time: 'Les envois audio sont autorisés uniquement de 14 h à 19 h IST.',
    sendError: 'Impossible d’envoyer le code.',
    selectOtp: 'Sélectionnez un audio et saisissez le code.',
    invalidOtp: 'Saisissez un code valide à 6 chiffres.',
    durationError: 'La durée audio doit être comprise entre 1 seconde et 5 minutes.',
    uploadError: 'Échec du téléversement audio.',
    success: 'Tweet audio téléversé avec succès.',
    loadError: 'Impossible de charger les tweets audio.',
  },
}

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

export default function AudioTweets({
  token,
  apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  language = 'English',
}) {
  const API_BASE = apiBase.replace(/\/$/, '')
  const t = translations[language] || translations.English

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
  const selectionVersionRef = useRef(0)

  const headers = {
    Authorization: `Bearer ${token}`,
  }

  function getAudioUrl(audioUrl) {
    if (!audioUrl) return ''

    if (/^https?:\/\//i.test(audioUrl)) {
      return audioUrl
    }

    const serverOrigin = API_BASE.replace(/\/api\/?$/, '')

    return `${serverOrigin}${audioUrl.startsWith('/') ? audioUrl : `/${audioUrl}`}`
  }

  function clearPreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }

    setPreviewUrl('')
  }

  function resetSelection() {
    // Invalidate metadata callbacks from an older selected file.
    selectionVersionRef.current += 1
    clearPreview()
    setFile(null)
    setFileDuration(0)
    setDuration(0)
    setOtp('')
    setOtpSent(false)
    secondsRef.current = 0
  }

  async function loadAudioTweets() {
    if (!token) return

    try {
      const response = await fetch(`${API_BASE}/audio`, { headers })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || t.loadError)
      }

      setAudioTweets(
        Array.isArray(data.audioTweets)
          ? data.audioTweets
          : Array.isArray(data.audios)
            ? data.audios
            : []
      )
    } catch (err) {
      setError(err.message || t.loadError)
    }
  }

  useEffect(() => {
    if (token) {
      loadAudioTweets()
    } else {
      setAudioTweets([])
    }

    return () => {
      clearInterval(timerRef.current)

      streamRef.current?.getTracks().forEach((track) => track.stop())

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [token, API_BASE])

  async function startRecording() {
    setError('')
    setMessage('')

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(t.unsupported)
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
          setError(t.maxSize)
          return
        }

        const extension = blob.type.includes('ogg')
          ? 'ogg'
          : blob.type.includes('mp4')
            ? 'm4a'
            : 'webm'

        const audioFile = new File(
          [blob],
          `audio-tweet-${Date.now()}.${extension}`,
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
    } catch {
      setError(t.mic)
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

    // Always clear the previous audio and its OTP before checking the new file.
    resetSelection()
    const currentSelection = selectionVersionRef.current

    setError('')
    setMessage('')

    if (selectedFile.size > MAX_SIZE) {
      setError(t.maxSize)
      return
    }

    if (!selectedFile.type.startsWith('audio/')) {
      setError(t.invalidFile)
      return
    }

    const url = URL.createObjectURL(selectedFile)
    previewUrlRef.current = url

    const audio = new Audio()
    audio.preload = 'metadata'
    audio.src = url

    audio.onloadedmetadata = () => {
      // Ignore an old file if the user selected another one in the meantime.
      if (selectionVersionRef.current !== currentSelection) return

      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        setError(t.readDuration)
        clearPreview()
        return
      }

      if (audio.duration > MAX_DURATION) {
        setError(t.maxDuration)
        clearPreview()
        return
      }

      setFile(selectedFile)
      setFileDuration(Math.max(1, Math.ceil(audio.duration)))
      setDuration(Math.ceil(audio.duration))
      setPreviewUrl(url)
    }

    audio.onerror = () => {
      if (selectionVersionRef.current !== currentSelection) return
      setError(t.readFile)
      clearPreview()
    }
  }

  async function requestOTP() {
    if (loading) return

    setError('')
    setMessage('')

    if (!file) {
      setError(t.selectFirst)
      return
    }
    if (!isUploadTimeAllowed()) {
      setError(t.time)
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
        throw new Error(data.message || t.sendError)
      }

      setOtpSent(true)
      setMessage(t.sendOtp + ' ✓')
    } catch (err) {
      setError(err.message || t.sendError)
    } finally {
      setLoading(false)
    }
  }

  async function uploadAudio(event) {
    event.preventDefault()
    if (loading) return

    setError('')
    setMessage('')

    if (!file || !otp.trim()) {
      setError(t.selectOtp)
      return
    }
    if (!isUploadTimeAllowed()) {
         setError(t.time)
        return
      }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError(t.invalidOtp)
      return
    }

    

    const actualDuration = fileDuration || duration

    if (!actualDuration || actualDuration > MAX_DURATION) {
      setError(t.durationError)
      return
    }

    if (file.size > MAX_SIZE) {
      setError(t.maxSize)
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
        throw new Error(data.message || t.uploadError)
      }

      setMessage(t.success)

      setOtp('')
      setOtpSent(false)
      resetSelection()

      await loadAudioTweets()
    } catch (err) {
      setError(err.message || t.uploadError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={styles.card}>
      <h3 style={styles.heading}>{t.heading}</h3>

      <p style={styles.subtext}>{t.description}</p>

      <div style={styles.actions}>
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={loading}
            style={styles.button}
          >
            {t.start}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            style={styles.stopButton}
          >
            {t.stop}
          </button>
        )}

        <label style={styles.fileButton}>
          {t.choose}
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={recording || loading}
            hidden
          />
        </label>
      </div>

      {recording && (
        <p style={styles.recording}>
          <span>● {t.recording}</span> {formatTime(duration)} / 05:00
        </p>
      )}

      {file && (
        <div style={styles.preview}>
          <p>
            <strong>{t.selected}</strong> {file.name}
          </p>

          <p>
            {t.duration} {formatTime(fileDuration)} | {t.size}{' '}
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
            {t.remove}
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
          {loading ? t.wait : t.sendOtp}
        </button>
      ) : (
        <form onSubmit={uploadAudio} style={styles.otpForm}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder={t.otpPlaceholder}
            value={otp}
            onChange={(event) => {
              setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
            }}
            style={styles.input}
          />

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? t.uploading : t.verifyUpload}
          </button>
        </form>
      )}

      {error && <p style={styles.error}>{error}</p>}
      {message && <p style={styles.success}>{message}</p>}

      <div style={styles.list}>
        <h4>{t.audioList}</h4>

        {audioTweets.length === 0 ? (
          <p style={styles.subtext}>{t.empty}</p>
        ) : (
          audioTweets.map((audio) => (
            <div
              key={audio._id || audio.id}
              style={styles.audioItem}
            >
              <p>
                {audio.originalName || audio.fileName || 'Audio Tweet'}
              </p>

              <audio
                controls
                src={getAudioUrl(audio.audioUrl)}
                style={{ width: '100%' }}
              />

              <small>
                {audio.durationSeconds
                  ? formatTime(audio.durationSeconds)
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
