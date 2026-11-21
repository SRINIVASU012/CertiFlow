import React from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const DemoUserSwitcher = () => {
  const { user, quickLogin } = useAuth();
  const navigate = useNavigate();

  const handleSwitch = async (e) => {
    const email = e.target.value;
    if (!email || email === user?.email) return;

    try {
      const loggedUser = await quickLogin(email);
      // Route to appropriate role dashboard
      if (loggedUser.role === 'TRAINING_CENTRE') navigate('/centre/dashboard');
      else if (loggedUser.role === 'DISTRICT_OFFICER') navigate('/district/dashboard');
      else if (loggedUser.role === 'QUALITY_TEAM') navigate('/quality/dashboard');
      else if (loggedUser.role === 'STATE_OFFICE') navigate('/state/dashboard');
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  return (
    <div className="d-flex align-items-center">
      <span className="badge bg-warning text-dark me-2 small">Demo Switcher:</span>
      <select
        className="form-select form-select-sm bg-light text-dark border-0 shadow-sm"
        style={{ width: 'auto', fontWeight: '500' }}
        value={user?.email || ''}
        onChange={handleSwitch}
      >
        <option value="" disabled>Switch Demo User...</option>
        {DEMO_ACCOUNTS.map((acc) => (
          <option key={acc.email} value={acc.email}>
            {acc.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DemoUserSwitcher;
