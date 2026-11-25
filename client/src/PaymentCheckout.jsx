
import { useEffect, useState } from 'react'

const PLANS = [
  {
    name: 'Bronze',
    price: 100,
    quota: '3 tweets / month',
    note: 'For casual conversations',
  },
  {
    name: 'Silver',
    price: 300,
    quota: '5 tweets / month',
    note: 'For more regular sharing',
  },
  {
    name: 'Gold',
    price: 1000,
    quota: 'Unlimited tweets',
    note: 'For unlimited sharing',
  },
]

const translations = {
  English: {
    heading: 'Upgrade your PulseConnect plan',
    description: 'Select a plan and enter your mobile number to continue to PayU.',
    current: 'CURRENT PLAN',
    expires: 'Expires on:',
    mobile: 'Mobile number registered for payment',
    phonePlaceholder: 'Enter 10-digit mobile number',
    pay: 'Pay',
    redirecting: 'Redirecting to PayU...',
    casual: 'For casual conversations',
    regular: 'For more regular sharing',
    unlimited: 'For unlimited sharing',
    bronzeQuota: '3 tweets / month',
    silverQuota: '5 tweets / month',
    goldQuota: 'Unlimited tweets',
    login: 'Please log in before making a payment.',
    invalidPhone: 'Please enter a valid 10-digit Indian mobile number.',
    invalidPlan: 'Please select a valid plan.',
    alreadySubscribed: 'You are already subscribed to this plan.',
    paymentError: 'Unable to initiate payment.',
    invalidResponse: 'Invalid payment response from server.',
    startError: 'Payment could not be started.',
  },

  Hindi: {
    heading: 'अपना PulseConnect प्लान अपग्रेड करें',
    description: 'PayU पर आगे बढ़ने के लिए प्लान चुनें और अपना मोबाइल नंबर दर्ज करें।',
    current: 'वर्तमान प्लान',
    expires: 'समाप्त होने की तारीख:',
    mobile: 'भुगतान के लिए रजिस्टर्ड मोबाइल नंबर',
    phonePlaceholder: '10 अंकों का मोबाइल नंबर दर्ज करें',
    pay: 'भुगतान करें',
    redirecting: 'PayU पर भेजा जा रहा है...',
    casual: 'सामान्य बातचीत के लिए',
    regular: 'नियमित रूप से साझा करने के लिए',
    unlimited: 'असीमित शेयरिंग के लिए',
    bronzeQuota: '3 ट्वीट / महीना',
    silverQuota: '5 ट्वीट / महीना',
    goldQuota: 'असीमित ट्वीट',
    login: 'भुगतान करने से पहले लॉग इन करें।',
    invalidPhone: 'कृपया सही 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें।',
    invalidPlan: 'कृपया सही प्लान चुनें।',
    alreadySubscribed: 'आप पहले से इस प्लान के सदस्य हैं।',
    paymentError: 'भुगतान शुरू नहीं हो सका।',
    invalidResponse: 'सर्वर से गलत भुगतान जानकारी मिली।',
    startError: 'भुगतान शुरू नहीं किया जा सका।',
  },

  Spanish: {
    heading: 'Mejora tu plan de PulseConnect',
    description: 'Selecciona un plan e introduce tu móvil para continuar con PayU.',
    current: 'PLAN ACTUAL',
    expires: 'Vence el:',
    mobile: 'Número móvil registrado para el pago',
    phonePlaceholder: 'Introduce un número de 10 dígitos',
    pay: 'Pagar',
    redirecting: 'Redirigiendo a PayU...',
    casual: 'Para conversaciones casuales',
    regular: 'Para compartir con más frecuencia',
    unlimited: 'Para compartir sin límites',
    bronzeQuota: '3 publicaciones / mes',
    silverQuota: '5 publicaciones / mes',
    goldQuota: 'Publicaciones ilimitadas',
    login: 'Inicia sesión antes de realizar el pago.',
    invalidPhone: 'Introduce un número móvil indio válido de 10 dígitos.',
    invalidPlan: 'Selecciona un plan válido.',
    alreadySubscribed: 'Ya tienes este plan.',
    paymentError: 'No se pudo iniciar el pago.',
    invalidResponse: 'Respuesta de pago no válida del servidor.',
    startError: 'No se pudo iniciar el pago.',
  },

  Portuguese: {
    heading: 'Atualize seu plano PulseConnect',
    description: 'Selecione um plano e informe seu celular para continuar com o PayU.',
    current: 'PLANO ATUAL',
    expires: 'Expira em:',
    mobile: 'Número de celular cadastrado para pagamento',
    phonePlaceholder: 'Digite um número de 10 dígitos',
    pay: 'Pagar',
    redirecting: 'Redirecionando para o PayU...',
    casual: 'Para conversas casuais',
    regular: 'Para compartilhar com mais frequência',
    unlimited: 'Para compartilhamento ilimitado',
    bronzeQuota: '3 publicações / mês',
    silverQuota: '5 publicações / mês',
    goldQuota: 'Publicações ilimitadas',
    login: 'Faça login antes de realizar o pagamento.',
    invalidPhone: 'Digite um número de celular indiano válido de 10 dígitos.',
    invalidPlan: 'Selecione um plano válido.',
    alreadySubscribed: 'Você já possui este plano.',
    paymentError: 'Não foi possível iniciar o pagamento.',
    invalidResponse: 'Resposta de pagamento inválida do servidor.',
    startError: 'Não foi possível iniciar o pagamento.',
  },

  Chinese: {
    heading: '升级您的 PulseConnect 套餐',
    description: '选择套餐并输入手机号码，然后继续使用 PayU。',
    current: '当前套餐',
    expires: '到期日期：',
    mobile: '用于付款的注册手机号码',
    phonePlaceholder: '输入 10 位手机号码',
    pay: '付款',
    redirecting: '正在跳转到 PayU...',
    casual: '适合日常交流',
    regular: '适合经常分享',
    unlimited: '无限分享',
    bronzeQuota: '每月 3 条推文',
    silverQuota: '每月 5 条推文',
    goldQuota: '无限推文',
    login: '请先登录再进行付款。',
    invalidPhone: '请输入有效的 10 位印度手机号码。',
    invalidPlan: '请选择有效的套餐。',
    alreadySubscribed: '您已经订阅了此套餐。',
    paymentError: '无法启动付款。',
    invalidResponse: '服务器返回了无效的付款信息。',
    startError: '无法开始付款。',
  },

  French: {
    heading: 'Améliorez votre forfait PulseConnect',
    description: 'Sélectionnez un forfait et saisissez votre numéro pour continuer avec PayU.',
    current: 'FORFAIT ACTUEL',
    expires: 'Expire le :',
    mobile: 'Numéro mobile enregistré pour le paiement',
    phonePlaceholder: 'Saisissez un numéro de 10 chiffres',
    pay: 'Payer',
    redirecting: 'Redirection vers PayU...',
    casual: 'Pour les conversations occasionnelles',
    regular: 'Pour partager plus régulièrement',
    unlimited: 'Pour un partage illimité',
    bronzeQuota: '3 publications / mois',
    silverQuota: '5 publications / mois',
    goldQuota: 'Publications illimitées',
    login: 'Veuillez vous connecter avant de payer.',
    invalidPhone: 'Saisissez un numéro indien valide de 10 chiffres.',
    invalidPlan: 'Veuillez sélectionner un forfait valide.',
    alreadySubscribed: 'Vous avez déjà souscrit à ce forfait.',
    paymentError: 'Impossible de lancer le paiement.',
    invalidResponse: 'Réponse de paiement invalide du serveur.',
    startError: 'Le paiement n’a pas pu démarrer.',
  },
}

const dateLocales = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Spanish: 'es-ES',
  Portuguese: 'pt-BR',
  Chinese: 'zh-CN',
  French: 'fr-FR',
}

function formatExpiryDate(value, language) {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString(
    dateLocales[language] || 'en-IN',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }
  )
}

export default function PaymentCheckout({
  token,
  apiBase,
  currentPlan = 'Free',
  subscriptionExpiresAt,
  language = 'English',
}) {
  const t = translations[language] || translations.English
  const API_BASE = (apiBase || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api')
    .replace(/\/+$/, '')

  const [phone, setPhone] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(() => {
    const firstAvailablePlan = PLANS.find((plan) => plan.name !== currentPlan)
    return firstAvailablePlan?.name || PLANS[0].name
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const expiryDate = formatExpiryDate(
    subscriptionExpiresAt,
    language
  )

  const selectedPlanDetails = PLANS.find(
    (plan) => plan.name === selectedPlan
  )

  // The user's plan may load after this component first appears.
  // Automatically choose another plan if the selected plan becomes current.
  useEffect(() => {
    if (selectedPlan === currentPlan) {
      const nextAvailablePlan = PLANS.find(
        (plan) => plan.name !== currentPlan
      )

      if (nextAvailablePlan) {
        setSelectedPlan(nextAvailablePlan.name)
      }
    }
  }, [currentPlan, selectedPlan])

  function getPlanText(plan) {
    if (plan.name === 'Bronze') {
      return {
        quota: t.bronzeQuota,
        note: t.casual,
      }
    }

    if (plan.name === 'Silver') {
      return {
        quota: t.silverQuota,
        note: t.regular,
      }
    }

    return {
      quota: t.goldQuota,
      note: t.unlimited,
    }
  }

  async function handlePayment() {
    if (loading) return

    setError('')

    if (!token) {
      setError(t.login)
      return
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError(t.invalidPhone)
      return
    }

    if (!selectedPlanDetails) {
      setError(t.invalidPlan)
      return
    }

    if (selectedPlan === currentPlan) {
      setError(t.alreadySubscribed)
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`${API_BASE}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: selectedPlan,
          phone,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || t.paymentError)
      }

      if (
        typeof data.paymentUrl !== 'string' ||
        !data.paymentUrl.startsWith('https://') ||
        !data.fields ||
        typeof data.fields !== 'object' ||
        Array.isArray(data.fields)
      ) {
        throw new Error(t.invalidResponse)
      }

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = data.paymentUrl

      Object.entries(data.fields).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = String(value ?? '')
        form.appendChild(input)
      })

      document.body.appendChild(form)
      form.submit()
    } catch (err) {
      setError(err.message || t.startError)
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h3>{t.heading}</h3>

      <p style={{ color: '#64748b', fontSize: 13 }}>
        {t.description}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
          marginTop: 18,
        }}
      >
        {PLANS.map((plan) => {
          const current = currentPlan === plan.name
          const selected = selectedPlan === plan.name
          const planText = getPlanText(plan)

          return (
            <button
              key={plan.name}
              type="button"
              disabled={current || loading}
              onClick={() => {
                setSelectedPlan(plan.name)
                setError('')
              }}
              style={{
                textAlign: 'left',
                border: selected
                  ? '2px solid #5546e8'
                  : '1px solid #e7eaf1',
                borderRadius: 12,
                padding: 18,
                background: selected ? '#f5f3ff' : '#fff',
                cursor: current || loading ? 'not-allowed' : 'pointer',
                opacity: current ? 0.65 : 1,
                color: '#172033',
              }}
            >
              <strong style={{ fontSize: 18 }}>
                {plan.name}
              </strong>

              {current && (
                <>
                  <span
                    style={{
                      display: 'block',
                      color: '#5546e8',
                      marginTop: 6,
                      fontWeight: 'bold',
                    }}
                  >
                    {t.current}
                  </span>

                  {expiryDate && (
                    <small
                      style={{
                        display: 'block',
                        marginTop: 8,
                        color: '#64748b',
                        fontSize: 12,
                      }}
                    >
                      {t.expires} {expiryDate}
                    </small>
                  )}
                </>
              )}

              <h2 style={{ margin: '12px 0' }}>
                ₹{plan.price}
              </h2>

              <p>{planText.quota}</p>

              <small>{planText.note}</small>
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 22 }}>
        <label htmlFor="payment-phone">
          <strong>{t.mobile}</strong>
        </label>

        <input
          id="payment-phone"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder={t.phonePlaceholder}
          value={phone}
          disabled={loading}
          onChange={(event) =>
            setPhone(
              event.target.value.replace(/\D/g, '').slice(0, 10)
            )
          }
          style={{
            display: 'block',
            width: '100%',
            maxWidth: 400,
            padding: 12,
            marginTop: 8,
            border: '1px solid #cbd5e1',
            borderRadius: 8,
          }}
        />
      </div>

      {error && (
        <p role="alert" style={{ color: '#dc2626', marginTop: 12 }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handlePayment}
        disabled={loading || !selectedPlanDetails}
        style={{
          marginTop: 18,
          padding: '12px 22px',
          border: 'none',
          borderRadius: 8,
          background: '#5546e8',
          color: '#fff',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading
          ? t.redirecting
          : `${t.pay} ₹${selectedPlanDetails?.price ?? 0}`}
      </button>
    </div>
  )
}
