import { useCallback, useEffect, useRef, useState } from 'react'
import AudioTweets from './AudioTweets'
import PaymentCheckout from './PaymentCheckout'
import { translate } from './translations'
import LanguageSettings from './LanguageSettings'
import './App.css'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const MSG91_WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID
const MSG91_TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH

const POSTS_URL = API_BASE + '/posts'

const TOKEN_KEY = 'pulseconnect_token'
const NOTIFICATION_KEY = 'pulseconnect_notifications'

const EXTRA_UI = {
Hindi: { loggedInAs:'लॉग इन हैं:', writePost:'पोस्ट लिखें', loadingPosts:'पोस्ट लोड हो रही हैं...', noPosts:'अभी कोई पोस्ट नहीं है। पहली पोस्ट आप करें!', likes:'पसंद', reply:'जवाब दें', share:'शेयर करें', about:'PulseConnect के बारे में', aboutText:'बातचीत, समुदाय और नए विचारों के लिए एक जगह।', accountSecurity:'खाते की सुरक्षा', securityText:'हाल के लॉगिन देखें। कोई अनजान गतिविधि दिखे तो सहायता से संपर्क करें।', whatsNext:'आगे क्या?', whatsNextText:'प्रोफ़ाइल, सब्सक्रिप्शन, ऑडियो पोस्ट, सूचनाएं और बहुत कुछ।', enterName:'अपना नाम दर्ज करें', chooseUsername:'यूज़रनेम चुनें', enterPassword:'अपना पासवर्ड दर्ज करें', mobileWithCode:'देश कोड सहित मोबाइल नंबर दर्ज करें', enterUsernameEmail:'यूज़रनेम या ईमेल दर्ज करें', enterRegisteredEmail:'अपना रजिस्टर्ड ईमेल दर्ज करें', forgotText:'अपने PulseConnect खाते से जुड़ा ईमेल दर्ज करें। हम आपको अस्थायी पासवर्ड भेजेंगे।', oneTimeDaily:'आप इस विकल्प का उपयोग दिन में केवल एक बार कर सकते हैं।', sendingTemporary:'अस्थायी पासवर्ड भेजा जा रहा है...', sendTemporary:'अस्थायी पासवर्ड भेजें', backLogin:'← लॉगिन पर वापस जाएं', verifyLogin:'लॉगिन सत्यापित करें', loginCodeText:'आपके रजिस्टर्ड ईमेल पर 6 अंकों का कोड भेजा गया है। लॉगिन पूरा करने के लिए कोड दर्ज करें।', sixDigitCode:'6 अंकों का सत्यापन कोड', enterOtp:'6 अंकों का OTP दर्ज करें', verifyLoginButton:'OTP सत्यापित करें और लॉगिन करें', loginText:'बातचीत में शामिल होने के लिए लॉगिन करें।', registerText:'PulseConnect से जुड़ें और अपनी दुनिया साझा करें।', createAccountButton:'खाता बनाएं →', noAccount:'खाता नहीं है? ', alreadyRegistered:'पहले से रजिस्टर हैं? ', mobileVerification:'मोबाइल सत्यापन', notAvailable:'उपलब्ध नहीं', mobileNotAdded:'मोबाइल नंबर नहीं जोड़ा गया', changeEmail:'रजिस्टर्ड ईमेल बदलें', refreshing:'रीफ़्रेश हो रहा है...', refresh:'↻ रीफ़्रेश', loadingHistory:'लॉगिन इतिहास लोड हो रहा है...', currentPlan:'वर्तमान प्लान', freePlanDescription:'शुरुआत करने के लिए', browserNotifications:'ब्राउज़र सूचनाएं', browserNotificationsText:'cricket या science शब्दों वाली नई पोस्ट का पूरा टेक्स्ट प्राप्त करें।', status:'स्थिति:', enabled:'चालू', disabled:'बंद', enableNotifications:'ब्राउज़र सूचनाएं चालू करें', disableNotifications:'ब्राउज़र सूचनाएं बंद करें', notificationsBlocked:'ब्राउज़र सेटिंग्स में सूचनाएं बंद हैं। इस वेबसाइट के लिए सूचनाएं चालू करें।'},
Spanish: { loggedInAs:'Conectado como', writePost:'Escribe una publicación', loadingPosts:'Cargando publicaciones...', noPosts:'Aún no hay publicaciones. ¡Sé el primero!', likes:'Me gusta', reply:'Responder', share:'Compartir', about:'Acerca de PulseConnect', aboutText:'Un lugar para conversar, crear comunidades y compartir ideas.', accountSecurity:'Seguridad de la cuenta', securityText:'Revisa los inicios de sesión recientes y contacta con soporte si ves actividad desconocida.', whatsNext:'¿Qué sigue?', whatsNextText:'Perfiles, suscripciones, publicaciones de audio, notificaciones y más.', enterName:'Introduce tu nombre', chooseUsername:'Elige un nombre de usuario', enterPassword:'Introduce tu contraseña', mobileWithCode:'Introduce el móvil con el código del país', enterUsernameEmail:'Introduce usuario o correo', enterRegisteredEmail:'Introduce tu correo registrado', forgotPassword:'¿Olvidaste tu contraseña?', forgotText:'Introduce el correo registrado en tu cuenta de PulseConnect. Te enviaremos una contraseña temporal.', oneTimeDaily:'Puedes usar esta opción solo una vez al día.', sendingTemporary:'Enviando contraseña temporal...', sendTemporary:'Enviar contraseña temporal', backLogin:'← Volver al inicio de sesión', verifyLogin:'Verifica tu inicio de sesión', loginCodeText:'Enviamos un código de 6 dígitos a tu correo registrado. Introdúcelo para completar el inicio de sesión.', sixDigitCode:'Código de verificación de 6 dígitos', enterOtp:'Introduce el OTP de 6 dígitos', verifyLoginButton:'Verificar OTP e iniciar sesión', loginText:'Inicia sesión para unirte a la conversación.', registerText:'Únete a PulseConnect y comparte tu mundo.', createAccountButton:'Crear cuenta →', noAccount:'¿No tienes cuenta? ', alreadyRegistered:'¿Ya estás registrado? ', mobileVerification:'Verificación del móvil', notAvailable:'No disponible', mobileNotAdded:'No se añadió ningún móvil', changeEmail:'Cambiar correo registrado', refreshing:'Actualizando...', refresh:'↻ Actualizar', loadingHistory:'Cargando historial de inicios de sesión...', currentPlan:'PLAN ACTUAL', freePlanDescription:'Para empezar', browserNotifications:'Notificaciones del navegador', browserNotificationsText:'Recibe el texto completo de nuevas publicaciones que contengan cricket o science.', status:'Estado:', enabled:'Activadas', disabled:'Desactivadas', enableNotifications:'Activar notificaciones del navegador', disableNotifications:'Desactivar notificaciones del navegador', notificationsBlocked:'Las notificaciones están bloqueadas. Permítelas para este sitio.'},
Portuguese: { loggedInAs:'Conectado como', writePost:'Escreva uma publicação', loadingPosts:'Carregando publicações...', noPosts:'Ainda não há publicações. Seja o primeiro!', likes:'Curtidas', reply:'Responder', share:'Compartilhar', about:'Sobre o PulseConnect', aboutText:'Um lugar para conversas, comunidades e novas ideias.', accountSecurity:'Segurança da conta', securityText:'Revise os logins recentes e contate o suporte se notar atividade desconhecida.', whatsNext:'O que vem a seguir?', whatsNextText:'Perfis, assinaturas, publicações de áudio, notificações e muito mais.', enterName:'Digite seu nome', chooseUsername:'Escolha um nome de usuário', enterPassword:'Digite sua senha', mobileWithCode:'Digite o celular com código do país', enterUsernameEmail:'Digite usuário ou e-mail', enterRegisteredEmail:'Digite seu e-mail cadastrado', forgotPassword:'Esqueceu sua senha?', forgotText:'Digite o e-mail cadastrado na sua conta PulseConnect. Enviaremos uma senha temporária.', oneTimeDaily:'Você pode usar esta opção apenas uma vez por dia.', sendingTemporary:'Enviando senha temporária...', sendTemporary:'Enviar senha temporária', backLogin:'← Voltar ao login', verifyLogin:'Verifique seu login', loginCodeText:'Enviamos um código de 6 dígitos para seu e-mail cadastrado. Digite-o para concluir o login.', sixDigitCode:'Código de verificação de 6 dígitos', enterOtp:'Digite o OTP de 6 dígitos', verifyLoginButton:'Verificar OTP e entrar', loginText:'Entre para participar da conversa.', registerText:'Junte-se ao PulseConnect e compartilhe seu mundo.', createAccountButton:'Criar conta →', noAccount:'Não tem uma conta? ', alreadyRegistered:'Já está cadastrado? ', mobileVerification:'Verificação do celular', notAvailable:'Não disponível', mobileNotAdded:'Número de celular não adicionado', changeEmail:'Alterar e-mail cadastrado', refreshing:'Atualizando...', refresh:'↻ Atualizar', loadingHistory:'Carregando histórico de login...', currentPlan:'PLANO ATUAL', freePlanDescription:'Para começar', browserNotifications:'Notificações do navegador', browserNotificationsText:'Receba o texto completo de novas publicações que contenham cricket ou science.', status:'Status:', enabled:'Ativadas', disabled:'Desativadas', enableNotifications:'Ativar notificações do navegador', disableNotifications:'Desativar notificações do navegador', notificationsBlocked:'As notificações estão bloqueadas. Permita notificações para este site.'},
Chinese: { loggedInAs:'登录用户', writePost:'写一条帖子', loadingPosts:'正在加载帖子...', noPosts:'暂无帖子。成为第一个发布的人吧！', likes:'赞', reply:'回复', share:'分享', about:'关于 PulseConnect', aboutText:'一个用于交流、社区和分享新想法的地方。', accountSecurity:'账户安全', securityText:'查看最近的登录记录。如发现异常活动，请联系支持团队。', whatsNext:'接下来', whatsNextText:'个人资料、订阅、音频帖子、通知等。', enterName:'输入姓名', chooseUsername:'选择用户名', enterPassword:'输入密码', mobileWithCode:'输入带国家代码的手机号码', enterUsernameEmail:'输入用户名或邮箱', enterRegisteredEmail:'输入注册邮箱', forgotPassword:'忘记密码？', forgotText:'请输入 PulseConnect 账户注册邮箱。我们会向你发送临时密码。', oneTimeDaily:'此功能每天只能使用一次。', sendingTemporary:'正在发送临时密码...', sendTemporary:'发送临时密码', backLogin:'← 返回登录', verifyLogin:'验证登录', loginCodeText:'我们已向你的注册邮箱发送六位验证码。请输入验证码以完成登录。', sixDigitCode:'六位验证码', enterOtp:'输入六位 OTP', verifyLoginButton:'验证 OTP 并登录', loginText:'登录以加入对话。', registerText:'加入 PulseConnect，分享你的世界。', createAccountButton:'创建账户 →', noAccount:'还没有账户？', alreadyRegistered:'已经注册？', mobileVerification:'手机验证', notAvailable:'不可用', mobileNotAdded:'尚未添加手机号码', changeEmail:'更改注册邮箱', refreshing:'正在刷新...', refresh:'↻ 刷新', loadingHistory:'正在加载登录记录...', currentPlan:'当前套餐', freePlanDescription:'适合开始使用', browserNotifications:'浏览器通知', browserNotificationsText:'接收包含 cricket 或 science 关键词的新帖全文。', status:'状态：', enabled:'已启用', disabled:'已停用', enableNotifications:'启用浏览器通知', disableNotifications:'关闭浏览器通知', notificationsBlocked:'浏览器设置已阻止通知。请允许此网站发送通知。'},
French: { loggedInAs:'Connecté en tant que', writePost:'Écrire une publication', loadingPosts:'Chargement des publications...', noPosts:'Aucune publication. Soyez le premier à publier !', likes:'J’aime', reply:'Répondre', share:'Partager', about:'À propos de PulseConnect', aboutText:'Un lieu de conversation, de communautés et de nouvelles idées.', accountSecurity:'Sécurité du compte', securityText:'Consultez les connexions récentes et contactez le support en cas d’activité inconnue.', whatsNext:'Et ensuite ?', whatsNextText:'Profils, abonnements, publications audio, notifications et plus encore.', enterName:'Saisissez votre nom', chooseUsername:'Choisissez un nom d’utilisateur', enterPassword:'Saisissez votre mot de passe', mobileWithCode:'Saisissez le numéro avec l’indicatif du pays', enterUsernameEmail:'Saisissez le nom ou l’e-mail', enterRegisteredEmail:'Saisissez votre e-mail enregistré', forgotPassword:'Mot de passe oublié ?', forgotText:'Saisissez l’adresse e-mail associée à votre compte PulseConnect. Nous vous enverrons un mot de passe temporaire.', oneTimeDaily:'Cette option ne peut être utilisée qu’une fois par jour.', sendingTemporary:'Envoi du mot de passe temporaire...', sendTemporary:'Envoyer le mot de passe temporaire', backLogin:'← Retour à la connexion', verifyLogin:'Vérifiez votre connexion', loginCodeText:'Un code à six chiffres a été envoyé à votre adresse e-mail enregistrée. Saisissez-le pour terminer la connexion.', sixDigitCode:'Code de vérification à six chiffres', enterOtp:'Saisissez le code OTP à six chiffres', verifyLoginButton:'Vérifier le code et se connecter', loginText:'Connectez-vous pour rejoindre la conversation.', registerText:'Rejoignez PulseConnect et partagez votre univers.', createAccountButton:'Créer un compte →', noAccount:'Pas encore de compte ? ', alreadyRegistered:'Déjà inscrit ? ', mobileVerification:'Vérification du mobile', notAvailable:'Indisponible', mobileNotAdded:'Aucun numéro mobile ajouté', changeEmail:'Modifier l’e-mail enregistré', refreshing:'Actualisation...', refresh:'↻ Actualiser', loadingHistory:'Chargement de l’historique des connexions...', currentPlan:'FORMULE ACTUELLE', freePlanDescription:'Pour commencer', browserNotifications:'Notifications du navigateur', browserNotificationsText:'Recevez le texte complet des nouvelles publications contenant cricket ou science.', status:'Statut :', enabled:'Activées', disabled:'Désactivées', enableNotifications:'Activer les notifications du navigateur', disableNotifications:'Désactiver les notifications du navigateur', notificationsBlocked:'Les notifications sont bloquées. Autorisez-les pour ce site.'}
}


Object.assign(EXTRA_UI.Hindi, { homeFeed:'होम फ़ीड', yourProfile:'आपकी प्रोफ़ाइल', profileSubtitle:'आपके खाते की जानकारी और हाल के लॉगिन।', settingsSubtitle:'अपना PulseConnect अनुभव प्रबंधित करें।', plansSubtitle:'अपनी बातचीत के लिए सही प्लान चुनें।', homeSubtitle:'आपकी दुनिया, रियल टाइम में।', fullName:'पूरा नाम', username:'यूज़रनेम', email:'ईमेल', mobile:'मोबाइल नंबर', subscription:'सब्सक्रिप्शन', memberSince:'सदस्य बने', accountDetails:'खाते की जानकारी', loginHistory:'लॉगिन इतिहास', choosePlan:'अपना PulseConnect प्लान चुनें', accountSettings:'खाता सेटिंग्स', currentEmail:'वर्तमान रजिस्टर्ड ईमेल', newEmail:'नया ईमेल पता', sendOtp:'सत्यापन OTP भेजें', sendingOtp:'OTP भेजा जा रहा है...', verificationCode:'सत्यापन कोड', verifying:'सत्यापन हो रहा है...', verifyUpdateEmail:'OTP सत्यापित करें और ईमेल अपडेट करें', backProfile:'प्रोफ़ाइल पर वापस जाएं' });
Object.assign(EXTRA_UI.Spanish, { homeFeed:'Inicio', yourProfile:'Tu perfil', profileSubtitle:'Los datos de tu cuenta y tus inicios de sesión recientes.', settingsSubtitle:'Administra tu experiencia en PulseConnect.', plansSubtitle:'Elige un plan adecuado para tus conversaciones.', homeSubtitle:'Tu mundo, en tiempo real.', fullName:'Nombre completo', username:'Nombre de usuario', email:'Correo electrónico', mobile:'Número móvil', subscription:'Suscripción', memberSince:'Miembro desde', accountDetails:'Datos de la cuenta', loginHistory:'Historial de inicio de sesión', choosePlan:'Elige tu plan de PulseConnect', accountSettings:'Configuración de la cuenta', currentEmail:'Correo registrado actual', newEmail:'Nueva dirección de correo', sendOtp:'Enviar OTP de verificación', sendingOtp:'Enviando OTP...', verificationCode:'Código de verificación', verifying:'Verificando...', verifyUpdateEmail:'Verificar OTP y actualizar correo', backProfile:'Volver al perfil' });
Object.assign(EXTRA_UI.Portuguese, { homeFeed:'Página inicial', yourProfile:'Seu perfil', profileSubtitle:'Detalhes da sua conta e logins recentes.', settingsSubtitle:'Gerencie sua experiência no PulseConnect.', plansSubtitle:'Escolha um plano para suas conversas.', homeSubtitle:'Seu mundo em tempo real.', fullName:'Nome completo', username:'Nome de usuário', email:'E-mail', mobile:'Número de celular', subscription:'Assinatura', memberSince:'Membro desde', accountDetails:'Detalhes da conta', loginHistory:'Histórico de login', choosePlan:'Escolha seu plano PulseConnect', accountSettings:'Configurações da conta', currentEmail:'E-mail cadastrado atual', newEmail:'Novo endereço de e-mail', sendOtp:'Enviar código de verificação', sendingOtp:'Enviando OTP...', verificationCode:'Código de verificação', verifying:'Verificando...', verifyUpdateEmail:'Verificar OTP e atualizar e-mail', backProfile:'Voltar ao perfil' });
Object.assign(EXTRA_UI.Chinese, { homeFeed:'首页动态', yourProfile:'你的个人资料', profileSubtitle:'账户详情和最近的登录记录。', settingsSubtitle:'管理你的 PulseConnect 使用体验。', plansSubtitle:'选择适合你交流需求的套餐。', homeSubtitle:'实时了解你的世界。', fullName:'姓名', username:'用户名', email:'电子邮箱', mobile:'手机号码', subscription:'订阅', memberSince:'加入时间', accountDetails:'账户详情', loginHistory:'登录历史', choosePlan:'选择你的 PulseConnect 套餐', accountSettings:'账户设置', currentEmail:'当前注册邮箱', newEmail:'新邮箱地址', sendOtp:'发送验证码', sendingOtp:'正在发送 OTP...', verificationCode:'验证码', verifying:'正在验证...', verifyUpdateEmail:'验证 OTP 并更新邮箱', backProfile:'返回个人资料' });
Object.assign(EXTRA_UI.French, { homeFeed:'Fil d’actualité', yourProfile:'Votre profil', profileSubtitle:'Les détails de votre compte et vos connexions récentes.', settingsSubtitle:'Gérez votre expérience PulseConnect.', plansSubtitle:'Choisissez une formule adaptée à vos conversations.', homeSubtitle:'Votre monde, en temps réel.', fullName:'Nom complet', username:'Nom d’utilisateur', email:'Adresse e-mail', mobile:'Numéro mobile', subscription:'Abonnement', memberSince:'Membre depuis', accountDetails:'Détails du compte', loginHistory:'Historique des connexions', choosePlan:'Choisissez votre formule PulseConnect', accountSettings:'Paramètres du compte', currentEmail:'Adresse e-mail actuelle', newEmail:'Nouvelle adresse e-mail', sendOtp:'Envoyer le code de vérification', sendingOtp:'Envoi du code...', verificationCode:'Code de vérification', verifying:'Vérification...', verifyUpdateEmail:'Vérifier et mettre à jour l’e-mail', backProfile:'Retour au profil' });

function App() {
  const [post, setPost] = useState('')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) || ''
  )
  const [user, setUser] = useState(null)
  const [language, setLanguage] = useState('English')

function t(key) {
  // Use the extra UI translations first, then the central translations.
  // This keeps labels translated even when a key is not in translations.js.
  return EXTRA_UI[language]?.[key] ?? translate(language, key, 'app')
}
  const [loginHistory, setLoginHistory] = useState([])
  const [profileLoading, setProfileLoading] = useState(false)
  const [activeView, setActiveView] = useState('home')
  const [paymentNotice, setPaymentNotice] = useState(null)
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authLoading, setAuthLoading] = useState(false)
  // Change temporary password state
const [currentPassword, setCurrentPassword] = useState('')
const [newPassword, setNewPassword] = useState('')
const [confirmPassword, setConfirmPassword] = useState('')
const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)
const [passwordChangeError, setPasswordChangeError] = useState('')
const [passwordChangeMessage, setPasswordChangeMessage] = useState('')

  // Browser notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const knownPostIds = useRef(new Set())
  const firstPostsLoad = useRef(true)

  // Chrome login OTP state
  const [loginOTPSent, setLoginOTPSent] = useState(false)
  const [loginOTPIdentifier, setLoginOTPIdentifier] = useState('')
  const [loginOTP, setLoginOTP] = useState('')
  const [loginOTPMessage, setLoginOTPMessage] = useState('')

 
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPhone, setForgotPhone] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotDailyLimitReached, setForgotDailyLimitReached] = useState(false)

  // Email change state
  const [newEmail, setNewEmail] = useState('')
  const [emailOTP, setEmailOTP] = useState('')
  const [emailOTPSent, setEmailOTPSent] = useState(false)
  const [emailChangeLoading, setEmailChangeLoading] = useState(false)
  const [emailChangeMessage, setEmailChangeMessage] = useState('')
  const [emailChangeError, setEmailChangeError] = useState('')

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    identifier: '',
    password: '',
  })

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function requestJSON(url, options = {}) {
    const response = await fetch(url, options)
    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Something went wrong')
    }

    return data
  }


  // Load the user's saved language preference.

  const fetchProfile = useCallback(async (currentToken = token) => {
    if (!currentToken) return

    try {
      setProfileLoading(true)

      const data = await requestJSON(API_BASE + '/auth/me', {
        headers: {
          Authorization: 'Bearer ' + currentToken,
        },
      })

      setUser(data.user)

      const savedPreference = Boolean(data.user.notificationsEnabled)
      setNotificationsEnabled(savedPreference)
      localStorage.setItem(NOTIFICATION_KEY, String(savedPreference))

      setLoginHistory(
        Array.isArray(data.loginHistory) ? data.loginHistory : []
      )
    } finally {
      setProfileLoading(false)
    }
  }, [token])

  const fetchPaymentHistory = useCallback(async () => {
    if (!token) return

    try {
      setPaymentsLoading(true)
      setPaymentsError('')

      const response = await fetch(API_BASE + '/payments/history', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not load payment history.')
      }

      setPayments(Array.isArray(data.payments) ? data.payments : [])
    } catch (err) {
      setPaymentsError(err.message || 'Could not load payment history.')
    } finally {
      setPaymentsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (activeView === 'plans' && token) {
      fetchPaymentHistory()
    }
  }, [activeView, token, fetchPaymentHistory])

useEffect(() => {
  if (!token) {
    setLanguage('English')
    return
  }

  let cancelled = false

  async function loadLanguage() {
    try {
      const data = await requestJSON(API_BASE + '/language/current', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      })

      if (!cancelled) {
        // The API returns preferredLanguage. Do not reset the language
        // whenever the user changes pages.
        const savedLanguage = data.preferredLanguage || data.language || 'English'
        setLanguage(savedLanguage)
      }
    } catch (err) {
      console.error('Could not load saved language:', err)
    }
  }

  loadLanguage()

  return () => {
    cancelled = true
  }
}, [token])

  async function loginUser(identifier, password) {
    const data = await requestJSON(API_BASE + '/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
    })

    if (data.requiresOTP) {
      setLoginOTPIdentifier(data.identifier || identifier.trim())
      setLoginOTP('')
      setLoginOTPMessage(
        data.message ||
          'A verification code has been sent to your registered email address.'
      )
      setLoginOTPSent(true)
      setError('')
      return
    }

    if (!data.token) {
      throw new Error('Login succeeded, but no token was received')
    }

    sessionStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    setLoginHistory([])
    setLoginOTPSent(false)
    setLoginOTPIdentifier('')
    setLoginOTP('')
    setLoginOTPMessage('')
    setActiveView('home')
    setError('')

    try {
      await fetchProfile(data.token)
    } catch {
      // Login can continue if login history fails to load.
    }
  }

  async function verifyLoginOTP(event) {
    event.preventDefault()
    if (authLoading) return

    const normalizedOTP = loginOTP.trim()

    if (!/^\d{6}$/.test(normalizedOTP)) {
      setError('Enter the valid 6-digit verification code.')
      return
    }

    try {
      setAuthLoading(true)
      setError('')

      const data = await requestJSON(
        API_BASE + '/auth/login/verify-otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: loginOTPIdentifier,
            otp: normalizedOTP,
          }),
        }
      )

      if (!data.token) {
        throw new Error(
          'Verification succeeded, but no login token was received.'
        )
      }

      sessionStorage.setItem(TOKEN_KEY, data.token)
      setToken(data.token)
      setUser(data.user)
      setLoginHistory([])
      setLoginOTPSent(false)
      setLoginOTPIdentifier('')
      setLoginOTP('')
      setLoginOTPMessage('')
      setActiveView('home')
      setError('')

      try {
        await fetchProfile(data.token)
      } catch {
        // Login can continue if profile history fails to load.
      }
    } catch (err) {
      setError(err.message || 'Could not verify the login code.')
    } finally {
      setAuthLoading(false)
    }
  }

  function backFromLoginOTP() {
    setLoginOTPSent(false)
    setLoginOTPIdentifier('')
    setLoginOTP('')
    setLoginOTPMessage('')
    setError('')
    setForm((current) => ({ ...current, password: '' }))
  }

  async function handleAuth(event) {
    event.preventDefault()
    if (authLoading) return

    try {
      setAuthLoading(true)
      setError('')

      if (authMode === 'register') {
        const username = form.username.trim().replace(/^@/, '')

        await requestJSON(API_BASE + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            username,
            email: form.email.trim(),
            phone: form.phone.trim(),
            password: form.password,
          }),
        })

        await loginUser(username, form.password)
      } else {
        await loginUser(form.identifier.trim(), form.password)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  // Start forgot-password verification using the registered mobile number.
  async function handleForgotPassword(event) {
    event.preventDefault()
    if (forgotLoading) return

    const normalizedPhone = forgotPhone.trim()

    if (!/^\+?[0-9\s()-]{10,16}$/.test(normalizedPhone)) {
      setForgotError('Please enter a valid registered mobile number.')
      setForgotMessage('')
      return
    }

    if (!MSG91_WIDGET_ID || !MSG91_TOKEN_AUTH) {
      setForgotError(
        'MSG91 widget is not configured. Check the client .env file.'
      )
      setForgotMessage('')
      return
    }

    try {
      setForgotLoading(true)
      setForgotError('')
      setForgotMessage('')

      const data = await requestJSON(
        API_BASE + '/auth/forgot-password/request-mobile-otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: normalizedPhone,
          }),
        }
      )

      if (!data.identifier) {
        throw new Error('The server did not return a mobile number for verification.')
      }

      setForgotMessage('Opening secure mobile OTP verification...')
      openForgotPasswordMSG91Widget(data.identifier)
    } catch (err) {
      const message = err.message || 'Could not start mobile verification.'
      if (message.toLowerCase().includes('one time per day')) {
        setForgotDailyLimitReached(true)
      }
      setForgotError(message)
      setForgotMessage('')
    } finally {
      setForgotLoading(false)
    }
  }

  // Open MSG91's secure OTP widget for password reset.
  function openForgotPasswordMSG91Widget(identifier) {
    const configuration = {
      widgetId: MSG91_WIDGET_ID,
      tokenAuth: MSG91_TOKEN_AUTH,
      identifier,
      exposeMethods: false,

      success: async (data) => {
        try {
          setForgotLoading(true)
          setForgotError('')
          setForgotMessage('Mobile number verified. Sending your temporary password...')

          const accessToken =
            data?.['access-token'] ||
            data?.accessToken ||
            data?.access_token ||
            data?.token ||
            data?.message

          if (typeof accessToken !== 'string' || !accessToken) {
            throw new Error(
              'MSG91 did not return a verification token. Please try again.'
            )
          }

          const verification = await requestJSON(
            API_BASE + '/auth/forgot-password/verify-mobile-token',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ accessToken }),
            }
          )

          if (!verification.resetToken) {
            throw new Error('Mobile verification succeeded, but no reset token was received.')
          }

          const resetResult = await requestJSON(
            API_BASE + '/auth/forgot-password/reset-with-mobile',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                resetToken: verification.resetToken,
              }),
            }
          )

          setForgotMessage(
            resetResult.message ||
              'A temporary password has been sent to your registered email address.'
          )
          setForgotError('')
        } catch (err) {
          const message = err.message || 'Mobile verification or password reset failed.'
          if (message.toLowerCase().includes('one time per day')) {
            setForgotDailyLimitReached(true)
          }
          setForgotError(message)
          setForgotMessage('')
        } finally {
          setForgotLoading(false)
        }
      },

      failure: (widgetError) => {
        console.error('MSG91 forgot-password widget error:', widgetError)
        setForgotError('MSG91 verification failed. Please try again.')
        setForgotMessage('')
        setForgotLoading(false)
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
            setForgotError('MSG91 widget could not be initialized.')
          }
        },
        { once: true }
      )

      existingScript.addEventListener(
        'error',
        () => {
          setForgotError('Could not load MSG91 widget. Please try again.')
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
        setForgotError('MSG91 widget could not be initialized.')
      }
    }

    script.onerror = () => {
      setForgotError('Could not load MSG91 widget. Please try again.')
    }

    document.body.appendChild(script)
  }

  function openForgotPassword() {
    setForgotPhone('')
    setForgotError('')
    setForgotMessage('')
    setShowForgotPassword(true)
  }

  function backToLogin() {
    setShowForgotPassword(false)
    setForgotPhone('')
    setForgotError('')
    setForgotMessage('')
    setForgotLoading(false)
    setAuthMode('login')
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY)

    setToken('')
    setUser(null)
    setNotificationsEnabled(false)
    knownPostIds.current.clear()
    firstPostsLoad.current = true
    setLoginHistory([])
    setPosts([])
    setPost('')
    setError('')
    setActiveView('home')
    setNewEmail('')
    setEmailOTP('')
    setEmailOTPSent(false)
    setEmailChangeMessage('')
    setEmailChangeError('')

    setLoginOTPSent(false)
    setLoginOTPIdentifier('')
    setLoginOTP('')
    setLoginOTPMessage('')

    setShowForgotPassword(false)
    setForgotPhone('')
    setForgotMessage('')
    setForgotError('')

    setForm({
      name: '',
      username: '',
      email: '',
      phone: '',
      identifier: '',
      password: '',
    })

    setAuthMode('login')
  }

  async function fetchPosts() {
    try {
      setError('')
      setLoading(true)

      const data = await requestJSON(POSTS_URL)
      const fetchedPosts = Array.isArray(data.posts) ? data.posts : []

      setPosts(fetchedPosts)
    } catch (err) {
      setError(err.message || 'Could not load posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoginHistory([])
      return
    }

    let cancelled = false

    async function verifySession() {
      try {
        const data = await requestJSON(API_BASE + '/auth/me', {
          headers: { Authorization: 'Bearer ' + token },
        })

        if (!cancelled) {
          setUser(data.user)
          const savedPreference = Boolean(data.user.notificationsEnabled)
          setNotificationsEnabled(savedPreference)
          localStorage.setItem(NOTIFICATION_KEY, String(savedPreference))
          setLoginHistory(
            Array.isArray(data.loginHistory) ? data.loginHistory : []
          )
        }
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(TOKEN_KEY)
          setToken('')
          setUser(null)
          setLoginHistory([])
          setError('Your session expired. Please log in again.')
        }
      }
    }

    verifySession()

    return () => {
      cancelled = true
    }
  }, [token])

  // Show the result after returning from PayU hosted checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')

    if (!paymentStatus) return

    setActiveView('plans')

    if (paymentStatus === 'success') {
      setPaymentNotice({
        type: 'success',
        message: 'Payment successful! Your subscription details are being refreshed.',
      })
    } else if (paymentStatus === 'failed') {
      setPaymentNotice({
        type: 'error',
        message: 'Payment failed. No subscription upgrade was applied.',
      })
    } else {
      setPaymentNotice({
        type: 'warning',
        message: 'Payment status is pending verification. Please check your payment history shortly.',
      })
    }

    window.history.replaceState({}, document.title, window.location.pathname)
  }, [])

  useEffect(() => {
    if (user) fetchPosts()
  }, [user])

  // Save browser notification preference in the backend database.
  async function saveNotificationPreference(enabled) {
    if (!token) {
      throw new Error('Please log in again to update notification settings.')
    }

    const data = await requestJSON(API_BASE + '/notifications/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ enabled }),
    })

    const savedValue = typeof data.notificationsEnabled === 'boolean'
      ? data.notificationsEnabled
      : typeof data.enabled === 'boolean'
        ? data.enabled
        : enabled

    setNotificationsEnabled(savedValue)
    localStorage.setItem(NOTIFICATION_KEY, String(savedValue))
    return savedValue
  }

  // Browser notification permission and saved preference.
  async function enableNotifications() {
    if (!('Notification' in window)) {
      setError('Your browser does not support notifications.')
      return
    }

    try {
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        setError('Please allow browser notifications to use this feature.')
        return
      }

      await saveNotificationPreference(true)
      setError('')
    } catch (err) {
      setError(err.message || 'Could not save browser notification settings.')
    }
  }

  async function disableNotifications() {
    try {
      await saveNotificationPreference(false)
      setError('')
    } catch (err) {
      setError(err.message || 'Could not save browser notification settings.')
    }
  }

  // Notify only for newly received posts containing cricket or science.
  useEffect(() => {
    if (!user || !notificationsEnabled || !('Notification' in window)) {
      return
    }

    if (Notification.permission !== 'granted') return

    if (firstPostsLoad.current) {
      posts.forEach((item) => {
        knownPostIds.current.add(String(item._id))
      })
      firstPostsLoad.current = false
      return
    }

    posts.forEach((item) => {
      const postId = String(item._id)

      if (knownPostIds.current.has(postId)) return

      knownPostIds.current.add(postId)

      const content = item.content || ''
      const matchesKeyword = /\b(cricket|science)\b/i.test(content)

      if (matchesKeyword) {
        new Notification('New PulseConnect post', {
          body: content,
          icon: '/vite.svg',
        })
      }
    })
  }, [posts, user, notificationsEnabled])

  // Check for new posts every 15 seconds.
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      requestJSON(POSTS_URL)
        .then((data) => {
          const fetchedPosts = Array.isArray(data.posts) ? data.posts : []
          setPosts(fetchedPosts)
        })
        .catch(() => {
          // Keep the existing feed if the refresh fails.
        })
    }, 15000)

    return () => clearInterval(interval)
  }, [user])

  async function createPost(event) {
    event.preventDefault()
    if (!post.trim() || submitting || !user || !token) return

    try {
      setSubmitting(true)
      setError('')

      const data = await requestJSON(POSTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ content: post.trim() }),
      })

      setPosts((currentPosts) => [data.post, ...currentPosts])
      setPost('')
    } catch (err) {
      setError(err.message || 'Could not create post')
    } finally {
      setSubmitting(false)
    }
  }

  async function openProfile() {
    setActiveView('profile')
    setError('')

    try {
      await fetchProfile(token)
    } catch (err) {
      setError(err.message || 'Could not load profile')
    }
  }

  function openSettings() {
    setActiveView('settings')
    setError('')
    setEmailChangeError('')
    setEmailChangeMessage('')
  }

  async function requestEmailChangeOTP(event) {
    event.preventDefault()
    if (emailChangeLoading) return

    const normalizedEmail = newEmail.trim().toLowerCase()

    if (!normalizedEmail) {
      setEmailChangeError('Please enter your new email address.')
      setEmailChangeMessage('')
      return
    }

    if (normalizedEmail === user?.email?.toLowerCase()) {
      setEmailChangeError(
        'Your new email must be different from your current email.'
      )
      setEmailChangeMessage('')
      return
    }

    try {
      setEmailChangeLoading(true)
      setEmailChangeError('')
      setEmailChangeMessage('')

      const data = await requestJSON(
        API_BASE + '/auth/change-email/request',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ newEmail: normalizedEmail }),
        }
      )

      setNewEmail(normalizedEmail)
      setEmailOTPSent(true)
      setEmailChangeMessage(
        data.message || 'OTP sent. Please check your new email address.'
      )
    } catch (err) {
      setEmailChangeError(
        err.message || 'Could not send the verification code.'
      )
    } finally {
      setEmailChangeLoading(false)
    }
  }

  async function verifyEmailChangeOTP(event) {
    event.preventDefault()
    if (emailChangeLoading) return

    const normalizedOTP = emailOTP.trim()

    if (!/^\d{6}$/.test(normalizedOTP)) {
      setEmailChangeError('Enter the valid 6-digit OTP.')
      setEmailChangeMessage('')
      return
    }

    try {
      setEmailChangeLoading(true)
      setEmailChangeError('')
      setEmailChangeMessage('')

      const data = await requestJSON(
        API_BASE + '/auth/change-email/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ otp: normalizedOTP }),
        }
      )

      if (data.user) {
        setUser(data.user)
      } else {
        await fetchProfile(token)
      }

      setNewEmail('')
      setEmailOTP('')
      setEmailOTPSent(false)
      setEmailChangeMessage(
        data.message || 'Your registered email was updated successfully.'
      )
    } catch (err) {
      setEmailChangeError(err.message || 'Could not verify the OTP.')
    } finally {
      setEmailChangeLoading(false)
    }
  }

  
function formatDate(value) {
  if (!value) return 'Unknown'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

async function handleChangePassword(event) {
  event.preventDefault()

  if (passwordChangeLoading) return

  setPasswordChangeError('')
  setPasswordChangeMessage('')

  if (newPassword !== confirmPassword) {
    setPasswordChangeError('New passwords do not match.')
    return
  }

  if (newPassword.length < 8) {
    setPasswordChangeError('Password must be at least 8 characters.')
    return
  }

  try {
    setPasswordChangeLoading(true)

    const data = await requestJSON(
      API_BASE + '/auth/change-password',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      }
    )

    setUser((previousUser) => ({
      ...previousUser,
      mustChangePassword: false,
    }))

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')

    setPasswordChangeMessage(
      data.message || 'Password changed successfully!'
    )

    setActiveView('home')
  } catch (err) {
    setPasswordChangeError(
      err.message || 'Could not change your password.'
    )
  } finally {
    setPasswordChangeLoading(false)
  }
}


  // Dedicated Forgot Password screen

  // Force users to change their temporary password
  if (user?.mustChangePassword === true) {
    return (
      <div style={styles.authPage}>
        <section style={styles.authCard}>
          <h1 className="logo" style={styles.authLogo}>
            Pulse<span>Connect</span>
          </h1>

          <h2 style={{ marginBottom: 8 }}>
            Change Your Password
          </h2>

          <p style={styles.muted}>
            You are using a temporary password.
            Please create a new password to continue using PulseConnect.
          </p>

          <form onSubmit={handleChangePassword} style={styles.authForm}>
            <label style={styles.label} htmlFor="current-password">
              Temporary Password
            </label>

            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter temporary password"
              autoComplete="current-password"
              required
              style={styles.input}
            />

            <label style={styles.label} htmlFor="new-password">
              New Password
            </label>

            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              minLength={8}
              required
              style={styles.input}
            />

            <label style={styles.label} htmlFor="confirm-password">
              Confirm New Password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              minLength={8}
              required
              style={styles.input}
            />

            {passwordChangeError && (
              <p role="alert" style={styles.error}>
                {passwordChangeError}
              </p>
            )}

            {passwordChangeMessage && (
              <p role="status" style={styles.successMessage}>
                {passwordChangeMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordChangeLoading}
              style={{
                ...styles.submitButton,
                opacity: passwordChangeLoading ? 0.7 : 1,
              }}
            >
              {passwordChangeLoading
                ? 'Changing Password...'
                : 'Change Password'}
            </button>
          </form>
        </section>
      </div>
    )
  }

  if (!user && showForgotPassword) {
    return (
      <div style={styles.authPage}>
        <section style={styles.authCard}>
          <h1 className="logo" style={styles.authLogo}>
            Pulse<span>Connect</span>
          </h1>

          <h2 style={{ marginBottom: 8 }}>Forgot Password?</h2>

          <p style={styles.muted}>
            Enter the mobile number registered with your PulseConnect account.
            We will verify it using an SMS OTP and send a temporary password
            to your registered email address.
          </p>

          <form onSubmit={handleForgotPassword} style={styles.authForm}>
            <label style={styles.label} htmlFor="forgot-phone">
              Registered mobile number
            </label>

            <input
              id="forgot-phone"
              type="tel"
              value={forgotPhone}
              onChange={(event) => {
                setForgotPhone(event.target.value)
                setForgotDailyLimitReached(false)
                setForgotError('')
                setForgotMessage('')
                          }}
              placeholder="Enter your registered mobile number"
              autoComplete="tel"
              maxLength={16}
              required
              style={styles.input}
            />

            <p style={styles.warningMessage}>
              You can reset your password only once per day.
              After mobile verification, the temporary password will be sent
              to the email saved in your account.
            </p>

            {forgotError && (
              <p role="alert" style={styles.error}>
                {forgotError}
              </p>
            )}

            {forgotMessage && (
              <p role="status" style={styles.successMessage}>
                {forgotMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={forgotLoading || forgotDailyLimitReached}
              style={{
                ...styles.submitButton,
                opacity: forgotLoading || forgotDailyLimitReached ? 0.55 : 1,
                cursor: forgotLoading || forgotDailyLimitReached ? 'not-allowed' : 'pointer',
              }}
            >
              {forgotLoading
                ? 'Please wait...'
                : forgotDailyLimitReached
                  ? 'Daily limit reached'
                  : 'Verify mobile number'}
            </button>
          </form>

          <button
            type="button"
            onClick={backToLogin}
            style={styles.backButton}
          >
            {t('backLogin')}
          </button>
        </section>
      </div>
    )
  }

  // Dedicated Chrome Login OTP screen
  if (!user && loginOTPSent) {
    return (
      <div style={styles.authPage}>
        <section style={styles.authCard}>
          <h1 className="logo" style={styles.authLogo}>
            Pulse<span>Connect</span>
          </h1>

          <h2 style={{ marginBottom: 8 }}>{t('verifyLogin')}</h2>

          <p style={styles.muted}>
            {t('loginCodeText')}
          </p>

          {loginOTPMessage && (
            <p role="status" style={styles.successMessage}>
              {loginOTPMessage}
            </p>
          )}

          <form onSubmit={verifyLoginOTP} style={styles.authForm}>
            <label style={styles.label} htmlFor="login-otp">
              {t('sixDigitCode')}
            </label>

            <input
              id="login-otp"
              name="loginOTP"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={loginOTP}
              onChange={(event) => {
                setLoginOTP(
                  event.target.value.replace(/\D/g, '').slice(0, 6)
                )
                setError('')
              }}
              placeholder={t('enterSixOtp')}
              maxLength={6}
              pattern="[0-9]{6}"
              required
              style={styles.input}
              autoFocus
            />

            {error && (
              <p role="alert" style={styles.error}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading || loginOTP.length !== 6}
              style={{
                ...styles.submitButton,
                opacity:
                  authLoading || loginOTP.length !== 6 ? 0.7 : 1,
              }}
            >
              {authLoading ? t('verifying') : t('verifyLoginButton')}
            </button>
          </form>

          <button
            type="button"
            onClick={backFromLoginOTP}
            disabled={authLoading}
            style={styles.backButton}
          >
            {t('backLogin')}
          </button>
        </section>
      </div>
    )
  }

  // Login and registration screen
  if (!user) {
    return (
      <div style={styles.authPage}>
        <section style={styles.authCard}>
          <h1 className="logo" style={styles.authLogo}>
            Pulse<span>Connect</span>
          </h1>

          <h2 style={{ marginBottom: 8 }}>
            {authMode === 'login'
              ? t('welcomeBack')
              : t('createAccount')}
          </h2>

          <p style={styles.muted}>
            {authMode === 'login'
              ? t('loginText')
              : t('registerText')}
          </p>

          <div style={styles.modeButtons}>
            <button
              type="button"
              style={authMode === 'login' ? styles.activeMode : styles.mode}
              onClick={() => {
                setAuthMode('login')
                setError('')
              }}
            >
              {t('login')}
            </button>

            <button
              type="button"
              style={
                authMode === 'register' ? styles.activeMode : styles.mode
              }
              onClick={() => {
                setAuthMode('register')
                setError('')
              }}
            >
              {t('register')}
            </button>
          </div>

          <form onSubmit={handleAuth} style={styles.authForm}>
            {authMode === 'register' && (
              <>
                <label style={styles.label} htmlFor="name">
                  {t('fullName')}
                </label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={updateForm}
                  placeholder={t('enterName')}
                  maxLength={50}
                  autoComplete="name"
                  required
                  style={styles.input}
                />

                <label style={styles.label} htmlFor="username">
                  {t('username')}
                </label>
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={updateForm}
                  placeholder={t('chooseUsername')}
                  maxLength={30}
                  autoComplete="username"
                  required
                  style={styles.input}
                />

                <label style={styles.label} htmlFor="register-email">
                  Email
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateForm}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  style={styles.input}
                />

                <label style={styles.label} htmlFor="register-phone">
                  {t('mobile')}
                </label>
                <input
                  id="register-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateForm}
                  placeholder={t('mobileWithCode')}
                  autoComplete="tel"
                  maxLength={16}
                  pattern="\+?[1-9][0-9]{9,14}"
                  title="Enter a valid mobile number with country code"
                  required
                  style={styles.input}
                />
              </>
            )}

            {authMode === 'login' && (
              <>
                <label style={styles.label} htmlFor="identifier">
                  {t('usernameOrEmail')}
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  value={form.identifier}
                  onChange={updateForm}
                  placeholder={t('enterUsernameEmail')}
                  autoComplete="username"
                  required
                  style={styles.input}
                />
              </>
            )}

            <label style={styles.label} htmlFor="password">
              {t('password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={updateForm}
              placeholder={t('enterPassword')}
              autoComplete={
                authMode === 'login' ? 'current-password' : 'new-password'
              }
              required
              style={styles.input}
            />

            {authMode === 'login' && (
              <div style={styles.forgotLinkRow}>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  style={styles.forgotLink}
                >
                  {t('forgot')}
                </button>
              </div>
            )}

            {error && (
              <p role="alert" style={styles.error}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              style={{
                ...styles.submitButton,
                opacity: authLoading ? 0.7 : 1,
              }}
            >
              {authLoading
                ? t('pleaseWait')
                : authMode === 'login'
                  ? t('login') + ' →'
                  : t('createAccountButton')}
            </button>
          </form>

          <p style={styles.switchText}>
            {authMode === 'login'
              ? t('noAccount')
              : t('alreadyRegistered')}
            <button
              type="button"
              style={styles.switchButton}
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login')
                setError('')
              }}
            >
              {authMode === 'login' ? t('register') : t('login')}
            </button>
          </p>
        </section>
      </div>
    )
  }

  const initial = user.name?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div className="app">
      <aside className="sidebar">
        <h1 className="logo">
          Pulse<span>Connect</span>
        </h1>

        <nav>
          <button
            type="button"
            className={activeView === 'home' ? 'active' : ''}
            style={styles.navButton}
            onClick={() => {
              setActiveView('home')
              setError('')
            }}
          >
            ⌂ {t('home')}
          </button>

          <button
            type="button"
            className="nav-button"
            style={styles.navButton}
            onClick={() => {
              setActiveView('home')
              setError('')
            }}
          >
            ▤ {t('explore')}
          </button>

          <button
            type="button"
            className="nav-button"
            style={styles.navButton}
            onClick={() => {
              setActiveView('home')
              setError('')
            }}
          >
            ♧ {t('notifications')}
          </button>

          <button
            type="button"
            className={activeView === 'profile' ? 'active' : ''}
            style={styles.navButton}
            onClick={openProfile}
          >
            ♙ {t('profile')}
          </button>

          <button
            type="button"
            className={activeView === 'plans' ? 'active' : ''}
            style={styles.navButton}
            onClick={() => {
              setActiveView('plans')
              setError('')
            }}
          >
            ◈ {t('plans')}
          </button>

          <button
            type="button"
            className={activeView === 'settings' ? 'active' : ''}
            style={styles.navButton}
            onClick={openSettings}
          >
            ⚙ {t('settings')}
          </button>
        </nav>

        <p className="sidebar-footer">{t('tagline')}</p>
      </aside>

      <main className="feed" id="home">
        <header style={styles.topbar}>
          <div style={styles.topbarTitle}>
            <h2>
              {activeView === 'profile'
                ? t('yourProfile')
                : activeView === 'settings'
                  ? t('settings')
                  : activeView === 'plans'
                    ? t('plans')
                    : t('homeFeed')}
            </h2>
            <p>
              {activeView === 'profile'
                ? t('profileSubtitle')
                : activeView === 'settings'
                  ? t('settingsSubtitle')
                  : activeView === 'plans'
                    ? t('plansSubtitle')
                    : t('homeSubtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            style={styles.logoutButton}
            aria-label="Log out of PulseConnect"
          >
            {t('logout')}
          </button>

          <button
            type="button"
            aria-label="Open profile"
            style={styles.avatarButton}
            onClick={openProfile}
          >
            <span className="avatar">{initial}</span>
          </button>
        </header>

        {error && (
          <p role="alert" style={styles.globalError}>
            {error}
          </p>
        )}

        {activeView === 'profile' ? (
          <section style={styles.profileSection}>
            <div style={styles.profileCard}>
              <div style={styles.profileAvatar}>{initial}</div>
              <div>
                <h2 style={styles.profileName}>{user.name}</h2>
                <p style={styles.profileUsername}>@{user.username}</p>
              </div>
            </div>

            <div style={styles.detailsCard}>
              <h3>{t('accountDetails')}</h3>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('fullName')}</span>
                <strong>{user.name || 'Not available'}</strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('username')}</span>
                <strong>@{user.username || 'Not available'}</strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('email')}</span>
                <strong style={styles.breakText}>
                  {user.email || 'Not available'}
                </strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('mobile')}</span>
                <strong style={styles.breakText}>
                  {user.phone || 'Mobile number not added'}
                </strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('mobileVerification')}</span>
                <strong
                  style={{
                    color: user.phoneVerified ? '#16a34a' : '#dc2626',
                    fontWeight: '600',
                  }}
                >
                  {user.phoneVerified ? t('verified') : t('notVerified')}
                </strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('subscription')}</span>
                <strong style={styles.subscriptionBadge}>
                  {user.subscription || 'Free'}
                </strong>
              </div>

              {user.createdAt && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>{t('memberSince')}</span>
                  <strong>{formatDate(user.createdAt)}</strong>
                </div>
              )}

              <button
                type="button"
                style={{ ...styles.refreshButton, marginTop: 16 }}
                onClick={openSettings}
              >
                {t('changeEmail')}
              </button>
            </div>

            <div style={styles.detailsCard}>
              <div style={styles.historyHeader}>
                <div>
                  <h3 style={{ marginBottom: 5 }}>{t('loginHistory')}</h3>
                  <p style={styles.muted}>
                    {t('recentLogins')}
                  </p>
                </div>

                <button
                  type="button"
                  style={styles.refreshButton}
                  disabled={profileLoading}
                  onClick={() =>
                    fetchProfile(token).catch((err) => setError(err.message))
                  }
                >
                  {profileLoading ? t('refreshing') : t('refresh')}
                </button>
              </div>

              {profileLoading ? (
                <p style={styles.emptyState}>
                  {t('loadingHistory')}
                </p>
              ) : loginHistory.length === 0 ? (
                <p style={styles.emptyState}>
                  {t('noLoginRecords')}
                </p>
              ) : (
                <div style={styles.historyList}>
                  {loginHistory.map((entry) => (
                    <article
                      key={entry._id || String(entry.loggedInAt) + '-' + String(entry.browser)}
                      style={styles.historyItem}
                    >
                      <div style={styles.historyIcon}>↗</div>
                      <div style={styles.historyInfo}>
                        <strong>{entry.browser || 'Unknown browser'}</strong>
                        <p style={styles.historyMeta}>
                          {entry.operatingSystem || 'Unknown OS'}
                          {' · '}
                          {entry.deviceCategory || 'Unknown device'}
                        </p>
                        <p style={styles.historyMeta}>
                          IP address: {entry.ipAddress || 'Unknown'}
                        </p>
                        <p style={styles.historyDate}>
                          {formatDate(entry.loggedInAt)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : activeView === 'plans' ? (
          <section style={styles.profileSection}>
            <div style={styles.detailsCard}>
              <h3 style={{ marginTop: 0 }}>{t('choosePlan')}</h3>
              <p style={styles.muted}>
                {t('planValidity')}
              </p>

              {paymentNotice && (
                <div
                  role="status"
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid ' + (
                      paymentNotice.type === 'success'
                        ? '#86efac'
                        : paymentNotice.type === 'error'
                          ? '#fca5a5'
                          : '#fcd34d'
                    ),
                    background:
                      paymentNotice.type === 'success'
                        ? '#f0fdf4'
                        : paymentNotice.type === 'error'
                          ? '#fef2f2'
                          : '#fffbeb',
                    color:
                      paymentNotice.type === 'success'
                        ? '#166534'
                        : paymentNotice.type === 'error'
                          ? '#991b1b'
                          : '#92400e',
                  }}
                >
                  {paymentNotice.message}
                </div>
              )}

              <div
                style={{
                  border: '1px solid #e7eaf1',
                  borderRadius: 12,
                  padding: 18,
                  marginTop: 20,
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: 18 }}>Free</h4>

                  {(user?.subscription || 'Free') === 'Free' && (
                    <span
                      style={{
                        color: '#5546e8',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {t('currentPlan')}
                    </span>
                  )}
                </div>

                <strong style={{ display: 'block', fontSize: 27, marginTop: 12 }}>
                  ₹0
                </strong>

                <strong>1 tweet / month</strong>

                <p style={{ ...styles.muted, marginBottom: 0 }}>
                  {t('freePlanDescription')}
                </p>
              </div>

              <PaymentCheckout
                token={token}
                apiBase={API_BASE}
                currentPlan={user?.subscription || 'Free'}
              />

              <p
                style={{
                  ...styles.muted,
                  marginTop: 18,
                  fontSize: 12,
                }}
              >
                {t('paidTerms')}
              </p>
              <div style={{ marginTop: 30 }}>
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  }}>
    <h3>Payment History</h3>

    <button
      type="button"
      onClick={fetchPaymentHistory}
      disabled={paymentsLoading}
    >
      {paymentsLoading ? 'Loading...' : 'Refresh'}
    </button>
  </div>

  {paymentsLoading ? (
    <p>Loading payment history...</p>
  ) : paymentsError ? (
    <p style={{ color: 'red' }}>{paymentsError}</p>
  ) : payments.length === 0 ? (
    <p>No payment records found.</p>
  ) : (
    payments.map((payment) => (
      <div
        key={payment._id || payment.txnid}
        style={{
          padding: 14,
          marginTop: 10,
          border: '1px solid #e7eaf1',
          borderRadius: 10,
        }}
      >
        <strong>{payment.plan}</strong>
        <p>Amount: ₹{payment.amount}</p>
        <p>Status: {payment.status}</p>
        <p>Transaction ID: {payment.txnid}</p>
        <small>
          {new Date(payment.createdAt).toLocaleString()}
        </small>
      </div>
    ))
  )}
</div>
            </div>
          </section>
        ) : activeView === 'settings' ? (
          <section style={styles.profileSection}>
            <div style={styles.detailsCard}>
              <h3>{t('accountSettings')}</h3>
              <p style={styles.muted}>
                {t('accountSettingsText')}
              </p>

              <div style={{ marginTop: 20, marginBottom: 20 }}>
                <span style={styles.detailLabel}>
                  {t('currentEmail')}
                </span>
                <p style={{ ...styles.breakText, fontWeight: 600 }}>
                  {user.email || 'Not available'}
                </p>
              </div>

              <form
                onSubmit={
                  emailOTPSent
                    ? verifyEmailChangeOTP
                    : requestEmailChangeOTP
                }
                style={styles.authForm}
              >
                {!emailOTPSent ? (
                  <>
                    <label style={styles.label} htmlFor="new-email">
                      {t('newEmail')}
                    </label>
                    <input
                      id="new-email"
                      name="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(event) => {
                        setNewEmail(event.target.value)
                        setEmailChangeError('')
                        setEmailChangeMessage('')
                      }}
                      placeholder={t('enterNewEmail')}
                      autoComplete="email"
                      maxLength={254}
                      required
                      style={styles.input}
                    />

                    <button
                      type="submit"
                      disabled={emailChangeLoading}
                      style={{
                        ...styles.submitButton,
                        opacity: emailChangeLoading ? 0.7 : 1,
                      }}
                    >
                      {emailChangeLoading
                        ? 'Sending OTP...'
                        : 'Send verification OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    <p style={styles.muted}>
                      {t('enterOtpSent')}
                    </p>
                    <strong style={styles.breakText}>{newEmail}</strong>

                    <label style={styles.label} htmlFor="email-change-otp">
                      {t('verificationCode')}
                    </label>
                    <input
                      id="email-change-otp"
                      name="emailOTP"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={emailOTP}
                      onChange={(event) => {
                        setEmailOTP(
                          event.target.value.replace(/\D/g, '').slice(0, 6)
                        )
                        setEmailChangeError('')
                      }}
                      placeholder={t('enterSixOtp')}
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      style={styles.input}
                    />

                    <button
                      type="submit"
                      disabled={
                        emailChangeLoading || emailOTP.length !== 6
                      }
                      style={{
                        ...styles.submitButton,
                        opacity:
                          emailChangeLoading || emailOTP.length !== 6
                            ? 0.7
                            : 1,
                      }}
                    >
                      {emailChangeLoading
                        ? 'Verifying...'
                        : 'Verify OTP and update email'}
                    </button>

                    <button
                      type="button"
                      disabled={emailChangeLoading}
                      style={styles.refreshButton}
                      onClick={() => {
                        setEmailOTPSent(false)
                        setEmailOTP('')
                        setEmailChangeError('')
                        setEmailChangeMessage('')
                      }}
                    >
                      {t('differentEmail')}
                    </button>
                  </>
                )}
              </form>

              {emailChangeError && (
                <p role="alert" style={styles.error}>
                  {emailChangeError}
                </p>
              )}

              {emailChangeMessage && (
                <p role="status" style={styles.successMessage}>
                  {emailChangeMessage}
                </p>
              )}

              <button
                type="button"
                style={{ ...styles.refreshButton, marginTop: 12 }}
                onClick={openProfile}
              >
                {t('backProfile')}
              </button>
            </div>

         

            
{/* Browser notification preferences */}
<div style={styles.detailsCard}>
  <h3>{t('browserNotifications')}</h3>

  <p style={styles.muted}>
    {t('browserNotificationsText')}
  </p>

  <p style={{ marginTop: 16 }}>
    {t('status')}{' '}
    <strong>
      {notificationsEnabled ? t('enabled') : t('disabled')}
    </strong>
  </p>

  {!notificationsEnabled ? (
    <button
      type="button"
      style={styles.submitButton}
      onClick={enableNotifications}
    >
      {t('enableNotifications')}
    </button>
  ) : (
    <button
      type="button"
      style={styles.refreshButton}
      onClick={disableNotifications}
    >
      {t('disableNotifications')}
    </button>
  )}

  {typeof Notification !== 'undefined' &&
    Notification.permission === 'denied' && (
      <p style={styles.error}>
        {t('notificationsBlocked')}
      </p>
    )}
</div>

            <LanguageSettings
              token={token}
              apiBase={API_BASE}
              onLanguageChange={(newLanguage) => setLanguage(newLanguage)}
            />
          </section>
        ) : (
          <>
            <div style={styles.welcome}>
              {t('loggedInAs')} <strong>{user.name}</strong> (@{user.username})
            </div>

            <AudioTweets token={token} apiBase={API_BASE} />

            <form className="composer" onSubmit={createPost}>
              <div className="avatar">{initial}</div>
              <div className="composer-body">
                <textarea
                  value={post}
                  onChange={(event) => setPost(event.target.value)}
                  placeholder={t('whatsHappening')}
                  maxLength={280}
                  aria-label={t('writePost')}
                />
                <div className="composer-bottom">
                  <span>{post.length}/280</span>
                  <button
                    type="submit"
                    disabled={!post.trim() || submitting}
                  >
                    {submitting ? t('posting') : t('post')}
                  </button>
                </div>
              </div>
            </form>

            <div className="feed-heading" id="feed">
              <h3>{t('latestPosts')}</h3>
              <span>{t('forYou')}</span>
            </div>

            {loading ? (
              <p style={{ padding: 24 }}>{t('loadingPosts')}</p>
            ) : posts.length === 0 ? (
              <p style={{ padding: 24 }}>
                {t('noPosts')}
              </p>
            ) : (
              posts.map((item) => (
                <article className="post-card" key={item._id}>
                  <div className="avatar">
                    {item.author?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="post-content">
                    <div className="post-author">
                      <strong>{item.author}</strong>
                      <span>@{item.username}</span>
                    </div>
                    <p>{item.content}</p>
                    <div className="post-actions">
                      <span>♡ {item.likes} {t('likes')}</span>
                      <span>◯ {t('reply')}</span>
                      <span>↗ {t('share')}</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </>
        )}
      </main>

      <aside className="rightbar">
        <section className="info-card">
          <h3>{t('about')}</h3>
          <p>{t('aboutText')}</p>
        </section>

        <section className="info-card">
          <h3>
            {activeView === 'profile' ? t('accountSecurity') : t('whatsNext')}
          </h3>
          <p>
            {activeView === 'profile'
              ? t('securityText')
              : t('whatsNextText')}
          </p>
        </section>

        <p className="copyright">© 2026 PulseConnect</p>
      </aside>
    </div>
  )
}

const styles = {
  authPage: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    background: '#f4f6fb',
    fontFamily: 'Arial, sans-serif',
  },
  authCard: {
    width: '100%',
    maxWidth: 430,
    padding: 32,
    borderRadius: 18,
    background: '#ffffff',
    boxShadow: '0 12px 40px rgba(25, 35, 70, 0.10)',
    boxSizing: 'border-box',
  },
  authLogo: { marginTop: 0, marginBottom: 28, fontSize: 28 },
  muted: { color: '#687386', lineHeight: 1.5, marginTop: 0 },
  modeButtons: { display: 'flex', gap: 8, margin: '24px 0' },
  mode: {
    flex: 1,
    padding: 11,
    border: '1px solid #dce1eb',
    borderRadius: 8,
    background: '#ffffff',
    cursor: 'pointer',
  },
  activeMode: {
    flex: 1,
    padding: 11,
    border: '1px solid #5546e8',
    borderRadius: 8,
    background: '#5546e8',
    color: '#ffffff',
    cursor: 'pointer',
  },
  authForm: { display: 'flex', flexDirection: 'column', gap: 9 },
  label: { fontSize: 14, fontWeight: 600, marginTop: 5 },
  input: {
    width: '100%',
    padding: '12px 13px',
    border: '1px solid #dce1eb',
    borderRadius: 8,
    fontSize: 15,
    boxSizing: 'border-box',
    outlineColor: '#5546e8',
  },
  submitButton: {
    padding: 13,
    marginTop: 12,
    border: 'none',
    borderRadius: 8,
    background: '#5546e8',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 15,
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
  successMessage: {
    color: '#246b45',
    background: '#edf8f0',
    padding: 10,
    borderRadius: 7,
    fontSize: 14,
    overflowWrap: 'anywhere',
  },
  warningMessage: {
    color: '#8a5b00',
    background: '#fff7e6',
    border: '1px solid #f3dfad',
    padding: 11,
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.5,
    margin: '5px 0',
  },
  forgotLinkRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: -2,
  },
  forgotLink: {
    border: 'none',
    background: 'transparent',
    color: '#5546e8',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    padding: '5px 0',
  },
  backButton: {
    width: '100%',
    marginTop: 18,
    padding: 11,
    border: '1px solid #dce1eb',
    borderRadius: 8,
    background: '#ffffff',
    color: '#30384a',
    fontWeight: 600,
    cursor: 'pointer',
  },
  switchText: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 14,
    color: '#687386',
  },
  switchButton: {
    border: 'none',
    background: 'transparent',
    color: '#5546e8',
    fontWeight: 700,
    cursor: 'pointer',
  },
  globalError: {
    color: '#c62828',
    padding: '0 24px',
    overflowWrap: 'anywhere',
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '20px 24px',
    borderBottom: '1px solid #e7eaf1',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    minWidth: 0,
  },
  topbarTitle: { flex: '1 1 auto', minWidth: 0 },
  logoutButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    position: 'relative',
    zIndex: 5,
    visibility: 'visible',
    opacity: 1,
    padding: '10px 16px',
    minWidth: 90,
    minHeight: 40,
    border: '1px solid #5546e8',
    borderRadius: 8,
    backgroundColor: '#5546e8',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.2,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  avatarButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
  },
  navButton: {
    display: 'block',
    width: '100%',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    font: 'inherit',
    cursor: 'pointer',
    padding: '10px 12px',
    borderRadius: 8,
  },
  welcome: { padding: '12px 24px', fontSize: 14, color: '#687386' },
  profileSection: {
    padding: '20px 24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 22,
    background: '#ffffff',
    border: '1px solid #e7eaf1',
    borderRadius: 14,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#5546e8',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 700,
    flexShrink: 0,
  },
  profileName: { margin: '0 0 5px', fontSize: 22 },
  profileUsername: { margin: 0, color: '#687386' },
  detailsCard: {
    padding: 22,
    background: '#ffffff',
    border: '1px solid #e7eaf1',
    borderRadius: 14,
    minWidth: 0,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: '13px 0',
    borderBottom: '1px solid #eef0f5',
    fontSize: 14,
  },
  detailLabel: { color: '#687386', flexShrink: 0 },
  breakText: { overflowWrap: 'anywhere', textAlign: 'right' },
  subscriptionBadge: {
    padding: '4px 10px',
    borderRadius: 20,
    background: '#efedff',
    color: '#5546e8',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  refreshButton: {
    border: '1px solid #dce1eb',
    borderRadius: 8,
    background: '#ffffff',
    color: '#30384a',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  emptyState: { padding: '18px 0', color: '#687386', lineHeight: 1.6 },
  historyList: { display: 'flex', flexDirection: 'column' },
  historyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '17px 0',
    borderTop: '1px solid #eef0f5',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#f0efff',
    color: '#5546e8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },
  historyInfo: { minWidth: 0, overflowWrap: 'anywhere' },
  historyMeta: { margin: '5px 0 0', color: '#687386', fontSize: 13 },
  historyDate: {
    margin: '7px 0 0',
    color: '#30384a',
    fontSize: 13,
    fontWeight: 600,
  },
}

export default App
