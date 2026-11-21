import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmationModal from '../../components/ConfirmationModal';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaUserGraduate,
  FaBuilding
} from 'react-icons/fa';

export const QualityBatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalType, setModalType] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchBatch = async () => {
    try {
      const res = await apiClient.get(`/batches/${id}`);
      setBatch(res.data.data.batch);
    } catch (err) {
      console.error('Error fetching quality batch details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading quality inspection workspace..." />;
  if (!batch) return <div className="alert alert-danger">Batch not found.</div>;

  const handleAction = async () => {
    if (modalType !== 'APPROVE' && (!reason || !reason.trim())) {
      setModalError('Reason is mandatory for returning or rejecting during quality review.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      if (modalType === 'APPROVE') {
        await apiClient.post(`/quality/batches/${id}/approve`, { reason });
      } else if (modalType === 'RETURN') {
        await apiClient.post(`/quality/batches/${id}/return`, { reason });
      } else if (modalType === 'REJECT') {
        await apiClient.post(`/quality/batches/${id}/reject`, { reason });
      }

      setModalType(null);
      setReason('');
      navigate('/quality/pending');
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link to="/quality/pending" className="btn btn-outline-secondary btn-sm">
          <FaArrowLeft className="me-1" /> Back to Pending Inspections
        </Link>
        <div className="d-flex gap-2">
          {batch.status === 'QUALITY_REVIEW' && (
            <>
              <button
                className="btn btn-outline-warning btn-sm"
                onClick={() => { setModalType('RETURN'); setReason(''); setModalError(''); }}
              >
                <FaExclamationTriangle className="me-1" /> Return to Centre
              </button>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => { setModalType('REJECT'); setReason(''); setModalError(''); }}
              >
                <FaTimesCircle className="me-1" /> Reject Batch
              </button>
              <button
                className="btn btn-success btn-sm px-3 fw-semibold"
                onClick={() => { setModalType('APPROVE'); setReason(''); setModalError(''); }}
              >
                <FaCheckCircle className="me-1" /> Approve Quality Review → Forward to State
              </button>
            </>
          )}
        </div>
      </div>

      {/* Overview Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-primary-navy text-white py-3 d-flex justify-content-between align-items-center">
          <div>
            <h4 className="fw-bold mb-0">{batch.batchNumber} — {batch.batchName}</h4>
            <span className="text-light opacity-75 small">Course: {batch.courseName}</span>
          </div>
          <StatusBadge status={batch.status} />
        </div>
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-3">
              <span className="small text-muted d-block"><FaBuilding className="me-1" /> Training Centre</span>
              <strong className="text-dark">{batch.trainingCentre?.name}</strong>
            </div>
            <div className="col-md-3">
              <span className="small text-muted d-block"><FaShieldAlt className="me-1" /> District</span>
              <strong className="text-dark">{batch.district?.name}</strong>
            </div>
            <div className="col-md-3">
              <span className="small text-muted d-block"><FaUserGraduate className="me-1" /> Cohort Size</span>
              <span className="fw-bold fs-6 text-warning bg-dark px-2 py-1 rounded">
                {batch.candidateCount} Candidates (Large Batch)
              </span>
            </div>
            <div className="col-md-3">
              <span className="small text-muted d-block">District Sign-Offs</span>
              <span className="badge bg-success">✓ 2 Officers Approved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Inspection Table */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3">
          <h5 className="fw-bold mb-0 text-dark">
            Candidates List for Quality Audit ({batch.candidates?.length || 0})
          </h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-secondary">
                <tr>
                  <th>Candidate ID</th>
                  <th>Candidate Name</th>
                  <th>Email</th>
                  <th>Mobile Number</th>
                  <th>Completion Date</th>
                </tr>
              </thead>
              <tbody className="small">
                {batch.candidates?.map((c) => (
                  <tr key={c.id}>
                    <td><code>{c.candidateIdentifier}</code></td>
                    <td className="fw-bold">{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.mobileNumber}</td>
                    <td>{new Date(c.completionDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={modalType !== null}
        title={
          modalType === 'APPROVE'
            ? 'Approve Quality Inspection'
            : modalType === 'RETURN'
            ? 'Return Batch for Corrections'
            : 'Reject Batch'
        }
        confirmText={
          modalType === 'APPROVE' ? 'Confirm Quality Sign-Off' : 'Submit Decision'
        }
        confirmVariant={modalType === 'APPROVE' ? 'success' : 'danger'}
        onConfirm={handleAction}
        onCancel={() => setModalType(null)}
      >
        {modalError && <div className="alert alert-danger py-2 small">{modalError}</div>}
        <div className="mb-3">
          <label className="form-label fw-bold text-dark small">
            {modalType === 'APPROVE'
              ? 'Quality Inspection Remarks (Optional):'
              : 'Mandatory Reason for Quality Team Return / Rejection:'}
          </label>
          <textarea
            className="form-control"
            rows="3"
            placeholder={
              modalType === 'APPROVE'
                ? 'e.g. Verified trainer-to-candidate ratio, lab infrastructure, and attendance logs.'
                : 'e.g. Training completion dates in rows 30-45 do not conform with required minimum curriculum hours.'
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required={modalType !== 'APPROVE'}
          ></textarea>
        </div>
      </ConfirmationModal>
    </div>
  );
};

export default QualityBatchDetails;
