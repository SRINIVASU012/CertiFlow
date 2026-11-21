import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DemoUserSwitcher from './DemoUserSwitcher';
import NotificationPanel from './NotificationPanel';
import { FaCertificate, FaSignOutAlt, FaShieldAlt } from 'react-icons/fa';

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-certiflow sticky-top px-3 py-2">
      <div className="container-fluid">
        <Link to="/" className="navbar-brand d-flex align-items-center me-4">
          <FaCertificate className="text-warning me-2" size={26} />
          <div className="d-flex flex-column">
            <span className="brand-text fs-5">CertiFlow</span>
            <span className="text-light opacity-75" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
              PRAGATI SKILLS MISSION
            </span>
          </div>
        </Link>

        <div className="d-flex align-items-center ms-auto">
          {/* Public Verification Link */}
          <Link to="/verify" className="btn btn-outline-warning btn-sm me-3 d-flex align-items-center">
            <FaShieldAlt className="me-1" /> Verify Certificate
          </Link>

          {/* Quick Demo Switcher - always visible */}
          <div className="me-2 me-md-3">
            <DemoUserSwitcher />
          </div>

          {isAuthenticated && (
            <>
              {/* Live Notifications */}
              <NotificationPanel />

              {/* User Identity Pill */}
              <div className="d-flex align-items-center text-white me-3 bg-dark bg-opacity-25 px-3 py-1 rounded-pill">
                <div className="d-flex flex-column text-end me-2">
                  <span className="fw-bold small">{user?.name}</span>
                  <span className="text-warning" style={{ fontSize: '0.68rem', fontWeight: '600' }}>
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="btn btn-outline-danger btn-sm d-flex align-items-center"
                title="Logout"
              >
                <FaSignOutAlt className="me-1" /> Logout
              </button>
            </>
          )}

          {!isAuthenticated && (
            <Link to="/login" className="btn btn-gold btn-sm">
              Official Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
