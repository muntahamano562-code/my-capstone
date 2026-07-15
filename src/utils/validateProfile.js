const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const validateProfile = (formData) => {
  const errors = {};
  let isValid = true;

  if (!formData.username) {
    errors.username = 'Username is required';
    isValid = false;
  } else if (formData.username.length < 4) {
    errors.username = 'Username must be at least 4 characters';
    isValid = false;
  }

  if (!formData.email) {
    errors.email = 'Email is required';
    isValid = false;
  } else if (!EMAIL_REGEX.test(formData.email)) {
    errors.email = 'Please enter a valid email';
    isValid = false;
  }

  if (!formData.password) {
    errors.password = 'Password is required';
    isValid = false;
  } else if (formData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
    isValid = false;
  }

  return { errors, isValid };
};