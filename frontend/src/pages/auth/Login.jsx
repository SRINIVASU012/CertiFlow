import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { FaCertificate, FaSignInAlt, FaLock, FaEnvelope, FaUserCheck } from 'react-icons/fa';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectUser = (role) => {
    const from = location.state?.from?.pathname;
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    if (role === 'TRAINING_CENTRE') navigate('/centre/dashboard');
    else if (role === 'DISTRICT_OFFICER') navigate('/district/dashboard');
    else if (role === 'QUALITY_TEAM') navigate('/quality/dashboard');
    else if (role === 'STATE_OFFICE') navigate('/state/dashboard');
    else navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      redirectUser(loggedUser.role);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail) => {
    setError('');
    setSubmitting(true);
    try {
      const loggedUser = await quickLogin(demoEmail);
      redirectUser(loggedUser.role);
    } catch (err) {
      setError('Quick login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-7 col-lg-5">
          <div className="card shadow-lg border-0 rounded-3">
            <div className="card-header bg-primary-navy text-white text-center py-4 border-bottom border-warning border-3">
              <FaCertificate className="text-warning mb-2" size={40} />
              <h3 className="fw-bold mb-0">CertiFlow Portal</h3>
              <p className="text-light opacity-75 small mb-0">Pragati Skills Mission • Official Sign In</p>
            </div>

            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Official Email Address</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><FaEnvelope className="text-muted" /></span>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. anika@pragati.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-semibold">Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><FaLock className="text-muted" /></span>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary-navy w-100 py-2 fw-semibold d-flex align-items-center justify-content-center"
                  disabled={submitting}
                >
                  <FaSignInAlt className="me-2" />
                  {submitting ? 'Verifying...' : 'Sign In'}
                </button>
              </form>

              {/* Demo Accounts Quick Login Section */}
              <div className="mt-4 pt-3 border-top">
                <div className="d-flex align-items-center mb-2">
                  <FaUserCheck className="text-primary me-2" />
                  <span className="small fw-bold text-dark">One-Click Demo Evaluator Logins:</span>
                </div>
                <div className="row g-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <div key={acc.email} className="col-6">
                      <button
                        type="button"
                        onClick={() => handleQuickLogin(acc.email)}
                        className="btn btn-outline-secondary btn-sm w-100 text-truncate text-start px-2 py-1"
                        style={{ fontSize: '0.75rem' }}
                        disabled={submitting}
                      >
                        <span className="fw-bold">{acc.label}</span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="text-muted text-center mt-2" style={{ fontSize: '0.72rem' }}>
                  Default password for all accounts: <code>Password@123</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
