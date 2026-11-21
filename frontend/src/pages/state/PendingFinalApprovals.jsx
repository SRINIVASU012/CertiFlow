import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmationModal from '../../components/ConfirmationModal';
import { FaCheckCircle, FaTimesCircle, FaCheckDouble, FaBuilding } from 'react-icons/fa';

export const PendingFinalApprovals = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [modalType, setModalType] = useState(null); // 'APPROVE', 'REJECT'
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchPending = async () => {
    try {
      const res = await apiClient.get('/state/batches', { params: { status: 'STATE_REVIEW' } });
      setBatches(res.data.data.batches);
    } catch (err) {
      console.error('Error fetching state pending batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async () => {
    if (modalType === 'REJECT' && (!reason || !reason.trim())) {
      setModalError('Rejection reason is mandatory.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      if (modalType === 'APPROVE') {
        await apiClient.post(`/state/batches/${selectedBatch.id}/approve`);
      } else {
        await apiClient.post(`/state/batches/${selectedBatch.id}/reject`, { reason });
      }

      setModalType(null);
      setSelectedBatch(null);
      setReason('');
      await fetchPending();
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading pending final approvals..." />;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1 d-flex align-items-center">
          <FaCheckDouble className="me-2 text-success" /> State Final Approval Queue
        </h3>
        <p className="text-muted small mb-0">
          Approving a batch triggers automated background PDF certificate generation and WhatsApp notifications via BullMQ.
        </p>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th>Batch Number</th>
                <th>Training Centre & Title</th>
                <th>District</th>
                <th>Candidates</th>
                <th>Approval Trail</th>
                <th className="text-end">Final Decisions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link to={`/centre/batches/${b.id}`} className="fw-bold text-primary text-decoration-none">
                      {b.batchNumber}
                    </Link>
                  </td>
                  <td>
                    <div className="fw-semibold text-dark">{b.batchName}</div>
                    <small className="text-muted">{b.courseName}</small>
                  </td>
                  <td>{b.district?.name}</td>
                  <td>
                    <span className="badge bg-light text-dark border px-2 py-1 fs-6">
                      {b.candidateCount} Candidates
                    </span>
                  </td>
                  <td>
                    <div className="d-flex flex-column gap-1">
                      <span className="badge bg-success bg-opacity-10 text-success border border-success">
                        ✓ 2 District Approvals
                      </span>
                      {b.candidateCount >= 50 && (
                        <span className="badge bg-warning bg-opacity-25 text-dark border border-warning">
                          ✓ Quality Review Approved
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => {
                          setSelectedBatch(b);
                          setModalType('REJECT');
                          setReason('');
                          setModalError('');
                        }}
                      >
                        <FaTimesCircle className="me-1" /> Reject
                      </button>
                      <button
                        className="btn btn-success btn-sm px-3 fw-semibold"
                        onClick={() => {
                          setSelectedBatch(b);
                          setModalType('APPROVE');
                          setReason('');
                          setModalError('');
                        }}
                      >
                        <FaCheckCircle className="me-1" /> Approve & Issue Certs
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    No batches currently pending final state approval.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={modalType !== null}
        title={modalType === 'APPROVE' ? 'Grant Final State Approval' : 'Reject Batch at State Level'}
        confirmText={modalType === 'APPROVE' ? 'Confirm Approval & Generate Certificates' : 'Reject Batch'}
        confirmVariant={modalType === 'APPROVE' ? 'success' : 'danger'}
        onConfirm={handleAction}
        onCancel={() => setModalType(null)}
      >
        {modalError && <div className="alert alert-danger py-2 small">{modalError}</div>}
        {modalType === 'APPROVE' ? (
          <div>
            <p className="text-secondary mb-2">
              You are granting final state certification approval for <strong>{selectedBatch?.batchNumber}</strong> ({selectedBatch?.candidateCount} candidates).
            </p>
            <div className="alert alert-info py-2 small">
              This action will automatically:
              <ul className="mb-0 mt-1 ps-3">
                <li>Generate {selectedBatch?.candidateCount} tamper-evident PDF certificates with unique numbers.</li>
                <li>Embed QR verification codes pointing to the public portal.</li>
                <li>Dispatch simulated WhatsApp notifications to all candidates.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <label className="form-label fw-bold text-dark small">Mandatory Rejection Reason:</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="State office rejection rationale..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            ></textarea>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
};

export default PendingFinalApprovals;
