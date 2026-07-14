const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/
const URL_REGEX = /^https?:\/\/.+\..+/

export const initialProfile = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  bio: '',
  website: '',
}

export function validateProfile(values) {
  const errors = {}

  const firstName = values.firstName.trim()
  if (!firstName) {
    errors.firstName = 'First name is required.'
  } else if (firstName.length < 2) {
    errors.firstName = 'First name must be at least 2 characters.'
  } else if (firstName.length > 50) {
    errors.firstName = 'First name must be 50 characters or fewer.'
  }

  const lastName = values.lastName.trim()
  if (!lastName) {
    errors.lastName = 'Last name is required.'
  } else if (lastName.length < 2) {
    errors.lastName = 'Last name must be at least 2 characters.'
  } else if (lastName.length > 50) {
    errors.lastName = 'Last name must be 50 characters or fewer.'
  }

  const email = values.email.trim()
  if (!email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  const username = values.username.trim()
  if (!username) {
    errors.username = 'Username is required.'
  } else if (username.length < 3) {
    errors.username = 'Username must be at least 3 characters.'
  } else if (username.length > 20) {
    errors.username = 'Username must be 20 characters or fewer.'
  } else if (!USERNAME_REGEX.test(username)) {
    errors.username = 'Username may only contain letters, numbers, hyphens, and underscores.'
  }

  const bio = values.bio.trim()
  if (bio.length > 160) {
    errors.bio = 'Bio must be 160 characters or fewer.'
  }

  const website = values.website.trim()
  if (website && !URL_REGEX.test(website)) {
    errors.website = 'Enter a valid URL starting with http:// or https://.'
  }

  return errors
}

export function validateField(name, values) {
  return validateProfile(values)[name] ?? ''
}
