import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaShieldAlt, FaQrcode, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export const CertificateVerification = () => {
  const [certNumber, setCertNumber] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (certNumber.trim()) {
      navigate(`/verify/${certNumber.trim().toUpperCase()}`);
    }
  };

  const handleDemoVerify = (num) => {
    navigate(`/verify/${num}`);
  };

  return (
    <div className="container py-5">
      <div className="verification-container">
        <div className="text-center mb-4">
          <div className="d-inline-flex p-3 bg-white rounded-circle shadow-sm mb-3">
            <FaShieldAlt className="text-primary" size={48} />
          </div>
          <h2 className="fw-bold text-dark">Public Certificate Verification Portal</h2>
          <p className="text-muted">
            Official Authenticity Verification for Pragati Skills Mission Certificates.
            Available for employers, candidates, and institutions. No login required.
          </p>
        </div>

        <div className="card shadow-sm border-0 p-4 mb-4">
          <form onSubmit={handleSearch}>
            <label className="form-label fw-bold text-dark mb-2">
              Enter Certificate Registration Number:
            </label>
            <div className="input-group input-group-lg">
              <span className="input-group-text bg-light"><FaQrcode className="text-muted" /></span>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. CERT-2026-000001"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary-navy px-4">
                <FaSearch className="me-2" /> Verify Now
              </button>
            </div>
            <div className="form-text mt-2 text-muted">
              Enter the exact certificate number printed on the document or scan the QR code.
            </div>
          </form>

          {/* Quick Demo Test Buttons */}
          <div className="mt-4 pt-3 border-top">
            <span className="small fw-bold text-secondary d-block mb-2">
              Quick Test Scenarios (from Seed Database):
            </span>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline-success btn-sm d-flex align-items-center"
                onClick={() => handleDemoVerify('CERT-2026-000001')}
              >
                <FaCheckCircle className="me-1" /> Test Valid: CERT-2026-000001
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm d-flex align-items-center"
                onClick={() => handleDemoVerify('CERT-2026-000002')}
              >
                <FaExclamationTriangle className="me-1" /> Test Cancelled: CERT-2026-000002
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handleDemoVerify('CERT-2026-999999')}
              >
                Test Not Found: CERT-2026-999999
              </button>
            </div>
          </div>
        </div>

        {/* Verification Standards Notice */}
        <div className="card bg-white border border-info border-opacity-25 p-3">
          <h6 className="fw-bold text-primary mb-1">Authenticity & Privacy Assurance</h6>
          <p className="small text-muted mb-0">
            CertiFlow validates credentials directly against state database records in real-time. 
            To safeguard candidate privacy, personally identifiable information such as phone numbers 
            and emails are strictly protected and never rendered publicly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateVerification;
