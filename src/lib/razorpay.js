export function openRazorpay({ amount, userEmail, userName, onSuccess, onError }) {
  const options = {
    key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount:      amount * 100, // paise
    currency:    'INR',
    name:        'San4 (Sanchaar)',
    description: 'Monthly Communication Coach Subscription',
    prefill:     { email: userEmail, name: userName },
    theme:       { color: '#7B5EA7' },
    handler: function (response) {
      onSuccess(response)
    },
    modal: {
      ondismiss: function () {
        onError && onError('Payment cancelled')
      },
    },
  }

  const rzp = new window.Razorpay(options)
  rzp.on('payment.failed', function (response) {
    onError && onError(response.error.description)
  })
  rzp.open()
}

export const PLANS = {
  free: {
    name:       'Free',
    price:      0,
    sessions:   3,
    features:   ['3 practice sessions/month', '2 meeting preps/month', 'Basic coaching report'],
  },
  founding: {
    name:       'Founding Member',
    price:      299,
    sessions:   -1, // unlimited
    features:   ['Unlimited practice sessions', 'Unlimited meeting preps', 'Full coaching reports', 'Progress tracking', 'Founding Member badge', 'Priority support'],
    badge:      'Limited — First 500 only',
  },
  pro: {
    name:       'Pro',
    price:      399,
    sessions:   -1,
    features:   ['Everything in Founding Member', 'Google Meet live overlay', 'Post-meeting analysis', 'Hindi/Hinglish support (coming soon)'],
  },
}
