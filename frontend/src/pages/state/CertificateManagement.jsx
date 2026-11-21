import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmationModal from '../../components/ConfirmationModal';
import { FaFilePdf, FaSearch, FaBan, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export const CertificateManagement = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Cancel Modal State
  const [selectedCert, setSelectedCert] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchCertificates = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/certificates', { params });
      setCertificates(res.data.data.certificates);
    } catch (err) {
      console.error('Error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCertificates();
  };

  const handleCancelCertificate = async () => {
    if (!reason || !reason.trim()) {
      setModalError('Cancellation reason is mandatory for legal and audit compliance.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      await apiClient.post(`/certificates/${selectedCert.id}/cancel`, { reason });
      setSelectedCert(null);
      setReason('');
      await fetchCertificates();
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Failed to cancel certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading central certificate registry..." />;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">State Certificate Registry & Revocation</h3>
        <p className="text-muted small mb-0">
          Official repository of all digitally signed qualification certificates. Cancelled certificates immediately reflect as INVALID on public verification lookups.
        </p>
      </div>

      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <form onSubmit={handleSearch} className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light"><FaSearch className="text-muted" /></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search certificate number, candidate name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-primary-navy">Search</button>
            </div>
          </div>
          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="VALID">Valid</option>
              <option value="CANCELLED">Cancelled / Revoked</option>
            </select>
          </div>
        </form>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th>Certificate Number</th>
                <th>Candidate Details</th>
                <th>Course & Training Centre</th>
                <th>Issue Date</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((c) => (
                <tr key={c.id}>
                  <td>
                    <a
                      href={`/verify/${c.certificateNumber}`}
                      target="_blank"
                      rel="noreferrer"
                      className="fw-bold text-primary text-decoration-none"
                    >
                      {c.certificateNumber}
                    </a>
                  </td>
                  <td>
                    <div className="fw-bold text-dark">{c.candidate?.name}</div>
                    <small className="text-muted">{c.candidate?.email} • {c.candidate?.mobileNumber}</small>
                  </td>
                  <td>
                    <div className="text-dark fw-semibold small">{c.candidate?.courseName}</div>
                    <small className="text-muted">{c.batch?.trainingCentre?.name}</small>
                  </td>
                  <td className="small text-muted">{new Date(c.issueDate).toLocaleDateString()}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <a
                        href={`http://localhost:5000/api/certificates/${c.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline-primary"
                        title="Download PDF"
                      >
                        <FaFilePdf className="me-1" /> PDF
                      </a>
                      {c.status === 'VALID' && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => {
                            setSelectedCert(c);
                            setReason('');
                            setModalError('');
                          }}
                          title="Revoke / Cancel Certificate"
                        >
                          <FaBan className="me-1" /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {certificates.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    No certificates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revocation Modal */}
      <ConfirmationModal
        show={selectedCert !== null}
        title="Revoke / Cancel Certificate"
        confirmText="Confirm Official Revocation"
        confirmVariant="danger"
        onConfirm={handleCancelCertificate}
        onCancel={() => setSelectedCert(null)}
      >
        {modalError && <div className="alert alert-danger py-2 small">{modalError}</div>}
        <p className="text-danger mb-2 small fw-semibold">
          Warning: Cancelling certificate <strong>{selectedCert?.certificateNumber}</strong> ({selectedCert?.candidate?.name}) cannot be undone. Public verification will immediately mark this credential as REVOKED / CANCELLED.
        </p>
        <div className="mb-3">
          <label className="form-label fw-bold small text-dark">
            Official Reason for Cancellation (Mandatory):
          </label>
          <textarea
            className="form-control"
            rows="3"
            placeholder="e.g. Discrepancy discovered during audit regarding candidate training attendance hours."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          ></textarea>
        </div>
      </ConfirmationModal>
    </div>
  );
};

export default CertificateManagement;
