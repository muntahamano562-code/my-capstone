import { useState, useMemo } from 'react';
import './ProfileSettingsForm.css';
import { validateProfile } from '../utils/validateProfile';

function TextField({ id, label, type = 'text', name, value, onChange, onBlur, error, autoComplete }) {
  const hasError = Boolean(error);

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input
        type={type}
        id={id}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError ? `${id}-error` : undefined}
      />
      {hasError && (
        <span id={`${id}-error`} className="error-message" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

const ProfileSettingsForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
  });

  const { errors, isValid } = useMemo(() => validateProfile(formData), [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted successfully:', formData);
    setFormData({ username: '', email: '', password: '' });
    setTouched({ username: false, email: false, password: false });
  };

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      <h2>Profile Settings</h2>

      <TextField
        id="username"
        label="Username"
        name="username"
        autoComplete="username"
        value={formData.username}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.username ? errors.username : ''}
      />

      <TextField
        id="email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={formData.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.email ? errors.email : ''}
      />

      <TextField
        id="password"
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={formData.password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.password ? errors.password : ''}
      />

      <button type="submit" disabled={!isValid}>
        Save Profile
      </button>
    </form>
  );
};

export default ProfileSettingsForm;
