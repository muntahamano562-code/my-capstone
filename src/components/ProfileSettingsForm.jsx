import { useState, useMemo } from 'react';
import "./ProfileSettingsForm.css";
import TextField from './TextField';
import { validateProfile } from '../utils/validateProfile';

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
  const [showSuccess, setShowSuccess] = useState(false);

  const { errors, isValid } = useMemo(() => validateProfile(formData), [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setShowSuccess(false);
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Profile updated successfully');
    setShowSuccess(true);
    setFormData({ username: '', email: '', password: '' });
    setTouched({ username: false, email: false, password: false });
  };

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      <h2>Profile Settings</h2>

      {showSuccess && (
        <div role="status" aria-live="polite">
          Profile updated successfully.
        </div>
      )}

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
