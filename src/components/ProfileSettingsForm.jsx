import { useState } from 'react'
import {
  initialProfile,
  validateField,
  validateProfile,
} from '../utils/validateProfile'
import './ProfileSettingsForm.css'

function ProfileSettingsForm() {
  const [values, setValues] = useState(initialProfile)
  const [touched, setTouched] = useState({})
  const [errors, setErrors] = useState({})
  const [submitStatus, setSubmitStatus] = useState(null)

  function getFieldError(name, nextValues = values) {
    return touched[name] ? validateField(name, nextValues) : ''
  }

  function handleChange(event) {
    const { name, value } = event.target
    const nextValues = { ...values, [name]: value }
    setValues(nextValues)
    setSubmitStatus(null)

    if (touched[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, nextValues),
      }))
    }
  }

  function handleBlur(event) {
    const { name } = event.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, values),
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const allTouched = Object.keys(initialProfile).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {},
    )
    setTouched(allTouched)

    const validationErrors = validateProfile(values)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      setSubmitStatus({ type: 'error', message: 'Fix the highlighted fields before saving.' })
      return
    }

    setSubmitStatus({ type: 'success', message: 'Profile saved successfully.' })
  }

  function handleReset() {
    setValues(initialProfile)
    setTouched({})
    setErrors({})
    setSubmitStatus(null)
  }

  const fields = [
    {
      name: 'firstName',
      label: 'First name',
      type: 'text',
      autoComplete: 'given-name',
      required: true,
    },
    {
      name: 'lastName',
      label: 'Last name',
      type: 'text',
      autoComplete: 'family-name',
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      autoComplete: 'email',
      required: true,
    },
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      autoComplete: 'username',
      required: true,
      hint: 'Letters, numbers, hyphens, and underscores only.',
    },
    {
      name: 'website',
      label: 'Website',
      type: 'url',
      autoComplete: 'url',
      placeholder: 'https://example.com',
    },
  ]

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      <header className="profile-form__header">
        <h1>Profile settings</h1>
        <p>Update your personal information and public profile.</p>
      </header>

      <div className="profile-form__grid">
        {fields.map(({ name, label, type, autoComplete, required, hint, placeholder }) => {
          const error = errors[name] || getFieldError(name)
          const errorId = `${name}-error`

          return (
            <div
              key={name}
              className={`profile-form__field${error ? ' profile-form__field--error' : ''}`}
            >
              <label htmlFor={name}>{label}</label>
              <input
                id={name}
                name={name}
                type={type}
                value={values[name]}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete={autoComplete}
                required={required}
                placeholder={placeholder}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : hint ? `${name}-hint` : undefined}
              />
              {hint && !error && (
                <span id={`${name}-hint`} className="profile-form__hint">
                  {hint}
                </span>
              )}
              {error && (
                <span id={errorId} className="profile-form__error" role="alert">
                  {error}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div
        className={`profile-form__field profile-form__field--full${errors.bio || getFieldError('bio') ? ' profile-form__field--error' : ''}`}
      >
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          name="bio"
          value={values.bio}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={4}
          maxLength={160}
          placeholder="Tell others a little about yourself."
          aria-invalid={Boolean(errors.bio || getFieldError('bio'))}
          aria-describedby={errors.bio || getFieldError('bio') ? 'bio-error' : 'bio-count'}
        />
        <div className="profile-form__meta">
          <span id="bio-count" className="profile-form__hint">
            {values.bio.length}/160
          </span>
          {(errors.bio || getFieldError('bio')) && (
            <span id="bio-error" className="profile-form__error" role="alert">
              {errors.bio || getFieldError('bio')}
            </span>
          )}
        </div>
      </div>

      {submitStatus && (
        <p
          className={`profile-form__status profile-form__status--${submitStatus.type}`}
          role="status"
        >
          {submitStatus.message}
        </p>
      )}

      <div className="profile-form__actions">
        <button type="button" className="profile-form__button profile-form__button--secondary" onClick={handleReset}>
          Reset
        </button>
        <button type="submit" className="profile-form__button profile-form__button--primary">
          Save changes
        </button>
      </div>
    </form>
  )
}

export default ProfileSettingsForm
