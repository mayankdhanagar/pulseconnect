
import { useEffect, useState } from 'react'

const LANGUAGES = [
  'English',
  'Spanish',
  'Hindi',
  'Portuguese',
  'Chinese',
  'French',
]


const languageSettingsTranslations = {
  English: {
    heading: 'Language Preferences',
    description: 'Choose your preferred application language. Verification is required before your language preference can be changed.',
    current: 'Current language:', select: 'Select language',
    emailOtpInfo: 'An email OTP will be sent to your registered email address.',
    mobileOtpInfo: 'A mobile OTP will be sent to your registered mobile number using MSG91.',
    wait: 'Please wait...', requestOtp: 'Request verification OTP',
    enterCode: 'Enter the six-digit verification code sent to your registered email address.',
    verificationOtp: 'Verification OTP', otpPlaceholder: 'Enter six-digit OTP',
    verifying: 'Verifying...', verifyChange: 'Verify OTP and change language',
    cancel: 'Cancel', success: 'Language changed successfully.',
    selectSupported: 'Please select a supported language.',
    alreadySelected: 'This language is already selected.',
    invalidServer: 'Invalid server response', somethingWrong: 'Something went wrong',
    loadError: 'Could not load your language preference',
    widgetConfig: 'MSG91 widget is not configured. Check the client .env file.',
    verifyMobile: 'Verifying your mobile number...',
    noToken: 'MSG91 did not return a verification token. Please try again.',
    mobileVerifyFailed: 'Mobile verification failed.',
    widgetFailed: 'MSG91 verification failed. Please try again.',
    widgetInit: 'MSG91 widget could not be initialized.',
    loadWidget: 'Could not load MSG91 widget. Please try again.',
    emailSent: 'Verification OTP sent to your email.',
    openingMobile: 'Opening secure MSG91 mobile verification...',
    unsupportedMethod: 'Unsupported verification method',
    startFailed: 'Could not start verification.',
    invalidOtp: 'Please enter the valid six-digit OTP.',
    verifyFailed: 'Could not verify the OTP.',
    emailOtpPlaceholder: 'Enter six-digit OTP'
  },
  Hindi: {
    heading: 'भाषा प्राथमिकताएँ',
    description: 'अपनी पसंदीदा ऐप भाषा चुनें। भाषा बदलने से पहले सत्यापन आवश्यक है।',
    current: 'वर्तमान भाषा:', select: 'भाषा चुनें',
    emailOtpInfo: 'सत्यापन OTP आपके रजिस्टर्ड ईमेल पर भेजा जाएगा।',
    mobileOtpInfo: 'MSG91 के माध्यम से आपके रजिस्टर्ड मोबाइल नंबर पर OTP भेजा जाएगा।',
    wait: 'कृपया प्रतीक्षा करें...', requestOtp: 'सत्यापन OTP भेजें',
    enterCode: 'आपके रजिस्टर्ड ईमेल पर भेजा गया 6 अंकों का OTP दर्ज करें।',
    verificationOtp: 'सत्यापन OTP', otpPlaceholder: '6 अंकों का OTP दर्ज करें',
    verifying: 'सत्यापन हो रहा है...', verifyChange: 'OTP सत्यापित करें और भाषा बदलें',
    cancel: 'रद्द करें', success: 'भाषा सफलतापूर्वक बदल दी गई।',
    selectSupported: 'कृपया समर्थित भाषा चुनें।',
    alreadySelected: 'यह भाषा पहले से चुनी गई है।',
    invalidServer: 'सर्वर का जवाब सही नहीं है', somethingWrong: 'कुछ गलत हुआ',
    loadError: 'आपकी भाषा प्राथमिकता लोड नहीं हो सकी',
    widgetConfig: 'MSG91 विजेट सेट नहीं है। क्लाइंट .env फ़ाइल जाँचें।',
    verifyMobile: 'आपके मोबाइल नंबर का सत्यापन हो रहा है...',
    noToken: 'MSG91 ने सत्यापन टोकन नहीं दिया। कृपया फिर कोशिश करें।',
    mobileVerifyFailed: 'मोबाइल सत्यापन विफल रहा।',
    widgetFailed: 'MSG91 सत्यापन विफल रहा। कृपया फिर कोशिश करें।',
    widgetInit: 'MSG91 विजेट शुरू नहीं हो सका।',
    loadWidget: 'MSG91 विजेट लोड नहीं हो सका। कृपया फिर कोशिश करें।',
    emailSent: 'सत्यापन OTP आपके ईमेल पर भेज दिया गया है।',
    openingMobile: 'सुरक्षित MSG91 मोबाइल सत्यापन खोला जा रहा है...',
    unsupportedMethod: 'यह सत्यापन तरीका समर्थित नहीं है।',
    startFailed: 'सत्यापन शुरू नहीं हो सका।',
    invalidOtp: 'कृपया सही 6 अंकों का OTP दर्ज करें।',
    verifyFailed: 'OTP सत्यापित नहीं हो सका।',
    emailOtpPlaceholder: '6 अंकों का OTP दर्ज करें'
  },
  Spanish: {
    heading: 'Preferencias de idioma',
    description: 'Elige el idioma de la aplicación. Debes verificar tu identidad antes de cambiarlo.',
    current: 'Idioma actual:', select: 'Seleccionar idioma',
    emailOtpInfo: 'Se enviará un código a tu correo electrónico registrado.',
    mobileOtpInfo: 'Se enviará un código a tu móvil registrado mediante MSG91.',
    wait: 'Espera...', requestOtp: 'Solicitar código de verificación',
    enterCode: 'Introduce el código de seis dígitos enviado a tu correo registrado.',
    verificationOtp: 'Código de verificación', otpPlaceholder: 'Introduce el código de seis dígitos',
    verifying: 'Verificando...', verifyChange: 'Verificar código y cambiar idioma',
    cancel: 'Cancelar', success: 'El idioma se cambió correctamente.',
    selectSupported: 'Selecciona un idioma compatible.',
    alreadySelected: 'Este idioma ya está seleccionado.',
    invalidServer: 'Respuesta del servidor no válida', somethingWrong: 'Algo salió mal',
    loadError: 'No se pudo cargar tu preferencia de idioma',
    widgetConfig: 'El widget de MSG91 no está configurado. Revisa el archivo .env del cliente.',
    verifyMobile: 'Verificando tu número de móvil...',
    noToken: 'MSG91 no devolvió un token de verificación. Inténtalo de nuevo.',
    mobileVerifyFailed: 'No se pudo verificar el móvil.',
    widgetFailed: 'Falló la verificación de MSG91. Inténtalo de nuevo.',
    widgetInit: 'No se pudo iniciar el widget de MSG91.',
    loadWidget: 'No se pudo cargar el widget de MSG91. Inténtalo de nuevo.',
    emailSent: 'Se envió el código de verificación a tu correo.',
    openingMobile: 'Abriendo la verificación móvil segura de MSG91...',
    unsupportedMethod: 'Método de verificación no compatible',
    startFailed: 'No se pudo iniciar la verificación.',
    invalidOtp: 'Introduce el código válido de seis dígitos.',
    verifyFailed: 'No se pudo verificar el código.',
    emailOtpPlaceholder: 'Introduce el código de seis dígitos'
  },
  Portuguese: {
    heading: 'Preferências de idioma',
    description: 'Escolha o idioma do aplicativo. É necessário verificar sua identidade antes de alterá-lo.',
    current: 'Idioma atual:', select: 'Selecionar idioma',
    emailOtpInfo: 'Um código será enviado para seu e-mail cadastrado.',
    mobileOtpInfo: 'Um código será enviado para seu celular cadastrado usando o MSG91.',
    wait: 'Aguarde...', requestOtp: 'Solicitar código de verificação',
    enterCode: 'Digite o código de seis dígitos enviado ao seu e-mail cadastrado.',
    verificationOtp: 'Código de verificação', otpPlaceholder: 'Digite o código de seis dígitos',
    verifying: 'Verificando...', verifyChange: 'Verificar código e alterar idioma',
    cancel: 'Cancelar', success: 'O idioma foi alterado com sucesso.',
    selectSupported: 'Selecione um idioma compatível.',
    alreadySelected: 'Este idioma já está selecionado.',
    invalidServer: 'Resposta inválida do servidor', somethingWrong: 'Algo deu errado',
    loadError: 'Não foi possível carregar sua preferência de idioma',
    widgetConfig: 'O widget MSG91 não está configurado. Verifique o arquivo .env do cliente.',
    verifyMobile: 'Verificando seu número de celular...',
    noToken: 'O MSG91 não retornou um token de verificação. Tente novamente.',
    mobileVerifyFailed: 'Falha na verificação do celular.',
    widgetFailed: 'Falha na verificação do MSG91. Tente novamente.',
    widgetInit: 'Não foi possível inicializar o widget MSG91.',
    loadWidget: 'Não foi possível carregar o widget MSG91. Tente novamente.',
    emailSent: 'Código de verificação enviado para seu e-mail.',
    openingMobile: 'Abrindo a verificação móvel segura do MSG91...',
    unsupportedMethod: 'Método de verificação não suportado',
    startFailed: 'Não foi possível iniciar a verificação.',
    invalidOtp: 'Digite o código válido de seis dígitos.',
    verifyFailed: 'Não foi possível verificar o código.',
    emailOtpPlaceholder: 'Digite o código de seis dígitos'
  },
  Chinese: {
    heading: '语言偏好设置',
    description: '选择您偏好的应用语言。更改语言前需要完成验证。',
    current: '当前语言：', select: '选择语言',
    emailOtpInfo: '验证码将发送到您注册的电子邮箱。',
    mobileOtpInfo: '验证码将通过 MSG91 发送到您注册的手机号码。',
    wait: '请稍候...', requestOtp: '请求验证码',
    enterCode: '请输入发送到您注册邮箱的六位验证码。',
    verificationOtp: '验证码', otpPlaceholder: '输入六位验证码',
    verifying: '正在验证...', verifyChange: '验证并更改语言',
    cancel: '取消', success: '语言已成功更改。',
    selectSupported: '请选择支持的语言。',
    alreadySelected: '已选择此语言。',
    invalidServer: '服务器响应无效', somethingWrong: '发生了错误',
    loadError: '无法加载您的语言偏好设置',
    widgetConfig: 'MSG91 小组件尚未配置。请检查客户端 .env 文件。',
    verifyMobile: '正在验证您的手机号码...',
    noToken: 'MSG91 未返回验证令牌。请重试。',
    mobileVerifyFailed: '手机验证失败。',
    widgetFailed: 'MSG91 验证失败。请重试。',
    widgetInit: '无法初始化 MSG91 小组件。',
    loadWidget: '无法加载 MSG91 小组件。请重试。',
    emailSent: '验证码已发送到您的邮箱。',
    openingMobile: '正在打开安全的 MSG91 手机验证...',
    unsupportedMethod: '不支持此验证方式',
    startFailed: '无法开始验证。',
    invalidOtp: '请输入有效的六位验证码。',
    verifyFailed: '无法验证验证码。',
    emailOtpPlaceholder: '输入六位验证码'
  },
  French: {
    heading: 'Préférences linguistiques',
    description: 'Choisissez la langue de l’application. Une vérification est nécessaire avant de la modifier.',
    current: 'Langue actuelle :', select: 'Choisir la langue',
    emailOtpInfo: 'Un code sera envoyé à votre adresse e-mail enregistrée.',
    mobileOtpInfo: 'Un code sera envoyé à votre mobile enregistré via MSG91.',
    wait: 'Veuillez patienter...', requestOtp: 'Demander le code de vérification',
    enterCode: 'Saisissez le code à six chiffres envoyé à votre adresse e-mail enregistrée.',
    verificationOtp: 'Code de vérification', otpPlaceholder: 'Saisissez le code à six chiffres',
    verifying: 'Vérification...', verifyChange: 'Vérifier le code et changer de langue',
    cancel: 'Annuler', success: 'La langue a été modifiée avec succès.',
    selectSupported: 'Veuillez choisir une langue prise en charge.',
    alreadySelected: 'Cette langue est déjà sélectionnée.',
    invalidServer: 'Réponse du serveur invalide', somethingWrong: 'Une erreur est survenue',
    loadError: 'Impossible de charger votre préférence linguistique',
    widgetConfig: 'Le widget MSG91 n’est pas configuré. Vérifiez le fichier .env du client.',
    verifyMobile: 'Vérification de votre numéro de mobile...',
    noToken: 'MSG91 n’a pas fourni de jeton de vérification. Veuillez réessayer.',
    mobileVerifyFailed: 'Échec de la vérification du mobile.',
    widgetFailed: 'Échec de la vérification MSG91. Veuillez réessayer.',
    widgetInit: 'Impossible d’initialiser le widget MSG91.',
    loadWidget: 'Impossible de charger le widget MSG91. Veuillez réessayer.',
    emailSent: 'Le code de vérification a été envoyé à votre e-mail.',
    openingMobile: 'Ouverture de la vérification mobile sécurisée MSG91...',
    unsupportedMethod: 'Méthode de vérification non prise en charge',
    startFailed: 'Impossible de démarrer la vérification.',
    invalidOtp: 'Veuillez saisir un code valide à six chiffres.',
    verifyFailed: 'Impossible de vérifier le code.',
    emailOtpPlaceholder: 'Saisissez le code à six chiffres'
  }
}


const MSG91_WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID
const MSG91_TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH

export default function LanguageSettings({
  token,
  apiBase,
  onLanguageChange,
}) {
  const [currentLanguage, setCurrentLanguage] = useState('English')
  const t = languageSettingsTranslations[currentLanguage] || languageSettingsTranslations.English
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function requestJSON(url, options = {}) {
    const response = await fetch(url, options)

    let data

    try {
      data = await response.json()
    } catch {
      throw new Error(t.invalidServer)
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || t.somethingWrong)
    }

    return data
  }

  // Load the saved language.
  useEffect(() => {
    let cancelled = false

    async function loadLanguage() {
      try {
        const data = await requestJSON(apiBase + '/language/current', {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        })

        if (!cancelled) {
          const language = data.preferredLanguage || 'English'

          setCurrentLanguage(language)
          setSelectedLanguage(language)

          // Update the language in the main App component.
          if (onLanguageChange) {
            onLanguageChange(language)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t.loadError)
        }
      }
    }

    if (token) {
      loadLanguage()
    }

    return () => {
      cancelled = true
    }
  }, [token, apiBase])

  // Open MSG91 verification widget.
  function openMSG91Widget(identifier, language) {
    if (!MSG91_WIDGET_ID || !MSG91_TOKEN_AUTH) {
      throw new Error(
        t.widgetConfig
      )
    }

    const configuration = {
      widgetId: MSG91_WIDGET_ID,
      tokenAuth: MSG91_TOKEN_AUTH,
      identifier,
      exposeMethods: false,

      success: async (data) => {
        try {
          setLoading(true)
          setError('')
          setMessage(t.verifyMobile)

          const accessToken =
            data?.['access-token'] ||
            data?.accessToken ||
            data?.access_token ||
            data?.token ||
            data?.message

          if (typeof accessToken !== 'string' || !accessToken) {
            throw new Error(
              t.noToken
            )
          }

          const result = await requestJSON(
            apiBase + '/language/verify-mobile-token',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token,
              },
              body: JSON.stringify({
                accessToken,
                language,
              }),
            }
          )

          const updatedLanguage = result.preferredLanguage

          setCurrentLanguage(updatedLanguage)
          setSelectedLanguage(updatedLanguage)

          // Immediately update the language in App.jsx.
          if (onLanguageChange) {
            onLanguageChange(updatedLanguage)
          }

          setOtp('')
          setOtpSent(false)

          setMessage(
            result.message || t.success
          )
        } catch (err) {
          setError(err.message || t.mobileVerifyFailed)
          setMessage('')
        } finally {
          setLoading(false)
        }
      },

      failure: (widgetError) => {
        console.error('MSG91 widget error:', widgetError)
        setError(t.widgetFailed)
        setMessage('')
        setLoading(false)
      },
    }

    if (typeof window.initSendOTP === 'function') {
      window.initSendOTP(configuration)
      return
    }

    const existingScript = document.querySelector(
      'script[data-msg91-widget="true"]'
    )

    if (existingScript) {
      existingScript.addEventListener(
        'load',
        () => {
          if (typeof window.initSendOTP === 'function') {
            window.initSendOTP(configuration)
          } else {
            setError(t.widgetInit)
          }
        },
        { once: true }
      )

      existingScript.addEventListener(
        'error',
        () => {
          setError(t.loadWidget)
        },
        { once: true }
      )

      return
    }

    const script = document.createElement('script')
    script.src = 'https://verify.msg91.com/otp-provider.js'
    script.async = true
    script.dataset.msg91Widget = 'true'

    script.onload = () => {
      if (typeof window.initSendOTP === 'function') {
        window.initSendOTP(configuration)
      } else {
        setError(t.widgetInit)
      }
    }

    script.onerror = () => {
      setError(t.loadWidget)
    }

    document.body.appendChild(script)
  }

  // Request verification OTP.
  async function requestOTP(event) {
    event.preventDefault()

    if (loading) return

    if (!LANGUAGES.includes(selectedLanguage)) {
      setError(t.selectSupported)
      return
    }

    if (selectedLanguage === currentLanguage) {
      setError(t.alreadySelected)
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      const data = await requestJSON(apiBase + '/language/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          language: selectedLanguage,
        }),
      })

      // Every supported language must use MSG91 mobile verification.
      // Do not start the legacy email OTP flow for French or any other language.
      if (data.channel === 'sms') {
        setMessage(t.openingMobile)
        openMSG91Widget(data.identifier, selectedLanguage)
        return
      }

      throw new Error(t.unsupportedMethod)
    } catch (err) {
      setError(err.message || t.startFailed)
      setMessage('')
    } finally {
      setLoading(false)
    }
  }

  // Verify email OTP.
  async function verifyOTP(event) {
    event.preventDefault()

    if (loading) return

    if (!/^\d{6}$/.test(otp)) {
      setError(t.invalidOtp)
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      const data = await requestJSON(apiBase + '/language/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ otp }),
      })

      const updatedLanguage = data.preferredLanguage

      setCurrentLanguage(updatedLanguage)
      setSelectedLanguage(updatedLanguage)

      // Immediately update the language in App.jsx.
      if (onLanguageChange) {
        onLanguageChange(updatedLanguage)
      }

      setOtp('')
      setOtpSent(false)

      setMessage(
        data.message || t.success
      )
    } catch (err) {
      setError(err.message || t.verifyFailed)
    } finally {
      setLoading(false)
    }
  }

  function cancelVerification() {
    setOtpSent(false)
    setOtp('')
    setSelectedLanguage(currentLanguage)
    setError('')
    setMessage('')
  }

  return (
    <div style={styles.card}>
      <h3>{t.heading}</h3>

      <p style={styles.muted}>
        {t.description}
      </p>

      <div style={styles.currentLanguage}>
        {t.current} <strong>{currentLanguage}</strong>
      </div>

      {!otpSent ? (
        <form onSubmit={requestOTP} style={styles.form}>
          <label htmlFor="preferred-language" style={styles.label}>
            {t.select}
          </label>

          <select
            id="preferred-language"
            value={selectedLanguage}
            onChange={(event) => {
              setSelectedLanguage(event.target.value)
              setError('')
              setMessage('')
            }}
            disabled={loading}
            style={styles.languageSelect}
          >
            {LANGUAGES.map((language) => (
              <option
                key={language}
                value={language}
                style={styles.languageOption}
              >
                {language}
              </option>
            ))}
          </select>

          <p style={styles.muted}>
            {t.mobileOtpInfo}
          </p>

          <button
            type="submit"
            disabled={loading || selectedLanguage === currentLanguage}
            style={{
              ...styles.primaryButton,
              opacity:
                loading || selectedLanguage === currentLanguage ? 0.6 : 1,
            }}
          >
            {loading ? t.wait : t.requestOtp}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOTP} style={styles.form}>
          <p style={styles.muted}>
            {t.enterCode}
          </p>

          <label htmlFor="language-otp" style={styles.label}>
            {t.verificationOtp}
          </label>

          <input
            id="language-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) => {
              setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
              setError('')
            }}
            placeholder={t.otpPlaceholder}
            maxLength={6}
            pattern="[0-9]{6}"
            required
            style={styles.input}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            style={{
              ...styles.primaryButton,
              opacity: loading || otp.length !== 6 ? 0.6 : 1,
            }}
          >
            {loading ? t.verifying : t.verifyChange}
          </button>

          <button
            type="button"
            onClick={cancelVerification}
            disabled={loading}
            style={styles.secondaryButton}
          >
            {t.cancel}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" style={styles.error}>
          {error}
        </p>
      )}

      {message && (
        <p role="status" style={styles.success}>
          {message}
        </p>
      )}
    </div>
  )
}

const styles = {
  card: {
    padding: 22,
    background: '#ffffff',
    border: '1px solid #e7eaf1',
    borderRadius: 14,
    minWidth: 0,
  },

  muted: {
    color: '#687386',
    lineHeight: 1.5,
    fontSize: 14,
  },

  currentLanguage: {
    marginTop: 16,
    padding: 12,
    background: '#f4f6fb',
    borderRadius: 8,
    fontSize: 14,
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
  },

  input: {
    width: '100%',
    padding: 12,
    border: '1px solid #dce1eb',
    borderRadius: 8,
    fontSize: 15,
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#1e293b',
  },

  languageSelect: {
    width: '100%',
    minHeight: 56,
    padding: '14px 16px',
    border: '1.5px solid #cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    outline: 'none',
    boxSizing: 'border-box',
    appearance: 'auto',
    WebkitAppearance: 'menulist',
  },

  languageOption: {
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontSize: 16,
    fontWeight: 500,
  },

  primaryButton: {
    padding: 13,
    marginTop: 6,
    border: 'none',
    borderRadius: 8,
    background: '#5546e8',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  },

  secondaryButton: {
    padding: 11,
    border: '1px solid #dce1eb',
    borderRadius: 8,
    background: '#ffffff',
    color: '#30384a',
    fontWeight: 600,
    cursor: 'pointer',
  },

  error: {
    color: '#c62828',
    background: '#fff0f0',
    padding: 10,
    borderRadius: 7,
    fontSize: 14,
    overflowWrap: 'anywhere',
  },

  success: {
    color: '#246b45',
    background: '#edf8f0',
    padding: 10,
    borderRadius: 7,
    fontSize: 14,
    overflowWrap: 'anywhere',
  },
}
