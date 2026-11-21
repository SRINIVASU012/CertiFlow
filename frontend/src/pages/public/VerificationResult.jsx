import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaDownload,
  FaArrowLeft,
  FaCertificate,
  FaBuilding,
  FaCalendarAlt,
  FaUserGraduate
} from 'react-icons/fa';

export const VerificationResult = () => {
  const { certificateNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVerification = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/public/verify/${certificateNumber}`);
        setResult(res.data);
      } catch (err) {
        if (err.response && err.response.data) {
          setResult(err.response.data);
        } else {
          setError('Failed to reach verification authority. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (certificateNumber) {
      fetchVerification();
    }
  }, [certificateNumber]);

  if (loading) {
    return <LoadingSpinner message={`Verifying authenticity of ${certificateNumber}...`} />;
  }

  const isCancelled = result?.verificationStatus === 'CANCELLED';
  const isValid = result?.verificationStatus === 'VALID';
  const isNotFound = result?.verificationStatus === 'NOT_FOUND' || !result;
  const cert = result?.data;

  return (
    <div className="container py-5">
      <div className="verification-container">
        <Link to="/verify" className="btn btn-outline-secondary btn-sm mb-4 d-inline-flex align-items-center">
          <FaArrowLeft className="me-2" /> Verify Another Certificate
        </Link>

        {/* 1. VALID CERTIFICATE */}
        {isValid && (
          <div className="certificate-card border-success">
            <div className="cert-border-gold">
              <div className="text-center mb-4">
                <FaCheckCircle className="text-success mb-2" size={54} />
                <h3 className="fw-bold text-success mb-1">OFFICIALLY VERIFIED & VALID</h3>
                <p className="text-muted small">
                  Pragati Skills Mission • National Skill Certification Registry
                </p>
                <div className="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2 fs-6">
                  Certificate No: {cert.certificateNumber}
                </div>
              </div>

              <div className="card bg-light border-0 p-4 mb-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <span className="small text-muted d-block"><FaUserGraduate className="me-1 text-primary" /> Candidate Name</span>
                    <strong className="fs-5 text-dark">{cert.candidateName}</strong>
                  </div>
                  <div className="col-md-6">
                    <span className="small text-muted d-block"><FaCertificate className="me-1 text-primary" /> Certified Course</span>
                    <strong className="fs-5 text-dark">{cert.courseName}</strong>
                  </div>
                  <div className="col-md-6">
                    <span className="small text-muted d-block"><FaBuilding className="me-1 text-primary" /> Training Institution</span>
                    <span className="fw-semibold text-secondary">{cert.trainingCentreName}</span>
                  </div>
                  <div className="col-md-6">
                    <span className="small text-muted d-block">District & State</span>
                    <span className="fw-semibold text-secondary">{cert.district}, {cert.state}</span>
                  </div>
                  <div className="col-md-6">
                    <span className="small text-muted d-block"><FaCalendarAlt className="me-1 text-primary" /> Completion Date</span>
                    <span className="fw-semibold text-secondary">
                      {new Date(cert.completionDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="col-md-6">
                    <span className="small text-muted d-block">Official Issue Date</span>
                    <span className="fw-semibold text-secondary">
                      {new Date(cert.issueDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <a
                  href={`http://localhost:5000/api/public/certificates/${cert.certificateNumber}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary-navy btn-lg px-4"
                >
                  <FaDownload className="me-2" /> Download Official PDF Certificate
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 2. CANCELLED / REVOKED CERTIFICATE */}
        {isCancelled && (
          <div className="certificate-card border-danger">
            <div className="p-4 bg-danger bg-opacity-10 border-bottom border-danger text-center">
              <FaTimesCircle className="text-danger mb-2" size={54} />
              <h2 className="fw-bold text-danger mb-0">REVOKED / CANCELLED CERTIFICATE</h2>
              <p className="text-danger fw-semibold mb-0">
                This credential is INVALID and no longer recognized by Pragati Skills Mission.
              </p>
            </div>

            <div className="p-4">
              <div className="alert alert-danger mb-4">
                <h6 className="fw-bold mb-1"><FaExclamationTriangle className="me-2" /> Reason for Revocation:</h6>
                <p className="mb-0">{cert?.cancellationReason || 'Revoked during official state audit.'}</p>
                <small className="d-block mt-2 text-muted">
                  Cancelled on: {new Date(cert?.cancelledAt).toLocaleString()}
                </small>
              </div>

              <div className="row g-3 text-secondary">
                <div className="col-md-6">
                  <span className="small text-muted d-block">Certificate Number</span>
                  <strong>{cert?.certificateNumber}</strong>
                </div>
                <div className="col-md-6">
                  <span className="small text-muted d-block">Candidate Name</span>
                  <strong>{cert?.candidateName}</strong>
                </div>
                <div className="col-md-6">
                  <span className="small text-muted d-block">Course</span>
                  <span>{cert?.courseName}</span>
                </div>
                <div className="col-md-6">
                  <span className="small text-muted d-block">Issued Centre</span>
                  <span>{cert?.trainingCentreName}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-light rounded text-center small text-muted">
                Public downloads for revoked certificates are blocked in compliance with state regulations.
              </div>
            </div>
          </div>
        )}

        {/* 3. NOT FOUND */}
        {isNotFound && (
          <div className="card shadow-sm border-warning p-5 text-center">
            <FaExclamationTriangle className="text-warning mx-auto mb-3" size={54} />
            <h3 className="fw-bold text-dark">CERTIFICATE NOT FOUND</h3>
            <p className="text-muted">
              No record matches certificate number <strong>{certificateNumber}</strong> in the central registry.
            </p>
            <p className="small text-muted">
              Please double check the spelling and formatting. If you believe this is an error,
              contact the issuing training centre or state certification authority.
            </p>
            <Link to="/verify" className="btn btn-outline-primary mx-auto mt-2">
              Try Another Number
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationResult;
