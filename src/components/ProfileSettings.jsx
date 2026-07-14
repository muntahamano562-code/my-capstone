import { useState } from 'react'
import './ProfileSettings.css'

const INITIAL_VALUES = {
  fullName: '',
  email: '',
  username: '',
  bio: '',
  phone: '',
  website: '',
  emailNotifications: true,
  marketingEmails: false,
}

const VALIDATORS = {
  fullName: (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Full name is required'
    if (trimmed.length < 2) return 'Full name must be at least 2 characters'
    if (trimmed.length > 80) return 'Full name must be 80 characters or fewer'
    return ''
  },
  email: (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'Enter a valid email address'
    }
    return ''
  },
  username: (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Username is required'
    if (trimmed.length < 3) return 'Username must be at least 3 characters'
    if (trimmed.length > 24) return 'Username must be 24 characters or fewer'
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return 'Username may only contain letters, numbers, and underscores'
    }
    return ''
  },
  bio: (value) => {
    if (value.length > 280) return 'Bio must be 280 characters or fewer'
    return ''
  },
  phone: (value) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (!/^\+?[\d\s\-().]{7,20}$/.test(trimmed)) {
      return 'Enter a valid phone number'
    }
    return ''
  },
  website: (value) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return 'Enter a valid URL'
      }
    } catch {
      return 'Enter a valid URL'
    }
    return ''
  },
}

function validateField(name, value) {
  const validator = VALIDATORS[name]
  return validator ? validator(value) : ''
}

function validateAll(values) {
  return Object.keys(VALIDATORS).reduce((errors, key) => {
    const message = validateField(key, values[key] ?? '')
    if (message) errors[key] = message
    return errors
  }, {})
}

export default function ProfileSettings() {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle')
  const [savedSnapshot, setSavedSnapshot] = useState(INITIAL_VALUES)

  const isDirty = JSON.stringify(values) !== JSON.stringify(savedSnapshot)

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    setValues((prev) => ({ ...prev, [name]: nextValue }))

    if (touched[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, nextValue),
      }))
    }

    if (status === 'success') setStatus('idle')
  }

  function handleBlur(event) {
    const { name, value, type, checked } = event.target
    const fieldValue = type === 'checkbox' ? checked : value

    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, fieldValue),
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateAll(values)
    setErrors(nextErrors)
    setTouched(
      Object.keys(VALIDATORS).reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {}),
    )

    if (Object.keys(nextErrors).length > 0) return

    setStatus('saving')

    window.setTimeout(() => {
      setSavedSnapshot(values)
      setStatus('success')
    }, 600)
  }

  function handleReset() {
    setValues(savedSnapshot)
    setErrors({})
    setTouched({})
    setStatus('idle')
  }

  return (
    <section className="profile-settings" aria-labelledby="profile-settings-title">
      <header className="profile-settings__header">
        <h1 id="profile-settings-title">Profile settings</h1>
        <p>Update your personal information and notification preferences.</p>
      </header>

      {status === 'success' && (
        <div className="profile-settings__alert profile-settings__alert--success" role="status">
          Profile saved successfully.
        </div>
      )}

      <form className="profile-settings__form" onSubmit={handleSubmit} noValidate>
        <fieldset className="profile-settings__fieldset">
          <legend>Personal information</legend>

          <div className="profile-settings__field">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={values.fullName}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              className={errors.fullName ? 'profile-settings__input--error' : ''}
            />
            {errors.fullName && (
              <span id="fullName-error" className="profile-settings__error" role="alert">
                {errors.fullName}
              </span>
            )}
          </div>

          <div className="profile-settings__field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={errors.email ? 'profile-settings__input--error' : ''}
            />
            {errors.email && (
              <span id="email-error" className="profile-settings__error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          <div className="profile-settings__field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={values.username}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? 'username-error' : undefined}
              className={errors.username ? 'profile-settings__input--error' : ''}
            />
            {errors.username && (
              <span id="username-error" className="profile-settings__error" role="alert">
                {errors.username}
              </span>
            )}
          </div>

          <div className="profile-settings__field">
            <label htmlFor="bio">
              Bio
              <span className="profile-settings__optional">(optional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              value={values.bio}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={Boolean(errors.bio)}
              aria-describedby="bio-hint bio-error"
              className={errors.bio ? 'profile-settings__input--error' : ''}
            />
            <span id="bio-hint" className="profile-settings__hint">
              {values.bio.length}/280 characters
            </span>
            {errors.bio && (
              <span id="bio-error" className="profile-settings__error" role="alert">
                {errors.bio}
              </span>
            )}
          </div>

          <div className="profile-settings__row">
            <div className="profile-settings__field">
              <label htmlFor="phone">
                Phone
                <span className="profile-settings__optional">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 (555) 123-4567"
                value={values.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                className={errors.phone ? 'profile-settings__input--error' : ''}
              />
              {errors.phone && (
                <span id="phone-error" className="profile-settings__error" role="alert">
                  {errors.phone}
                </span>
              )}
            </div>

            <div className="profile-settings__field">
              <label htmlFor="website">
                Website
                <span className="profile-settings__optional">(optional)</span>
              </label>
              <input
                id="website"
                name="website"
                type="url"
                autoComplete="url"
                placeholder="https://example.com"
                value={values.website}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(errors.website)}
                aria-describedby={errors.website ? 'website-error' : undefined}
                className={errors.website ? 'profile-settings__input--error' : ''}
              />
              {errors.website && (
                <span id="website-error" className="profile-settings__error" role="alert">
                  {errors.website}
                </span>
              )}
            </div>
          </div>
        </fieldset>

        <fieldset className="profile-settings__fieldset">
          <legend>Notifications</legend>

          <label className="profile-settings__checkbox">
            <input
              type="checkbox"
              name="emailNotifications"
              checked={values.emailNotifications}
              onChange={handleChange}
            />
            <span>Email me about account activity</span>
          </label>

          <label className="profile-settings__checkbox">
            <input
              type="checkbox"
              name="marketingEmails"
              checked={values.marketingEmails}
              onChange={handleChange}
            />
            <span>Send product updates and marketing emails</span>
          </label>
        </fieldset>

        <div className="profile-settings__actions">
          <button
            type="button"
            className="profile-settings__btn profile-settings__btn--secondary"
            onClick={handleReset}
            disabled={!isDirty || status === 'saving'}
          >
            Reset
          </button>
          <button
            type="submit"
            className="profile-settings__btn profile-settings__btn--primary"
            disabled={status === 'saving'}
          >
            {status === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  )
}
