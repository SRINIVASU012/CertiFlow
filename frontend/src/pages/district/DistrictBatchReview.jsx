import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useAuth } from '../../context/AuthContext';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaUserGraduate,
  FaBuilding,
  FaCalendarAlt,
  FaShieldAlt
} from 'react-icons/fa';

export const DistrictBatchReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [modalType, setModalType] = useState(null); // 'APPROVE', 'RETURN', 'REJECT'
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchBatch = async () => {
    try {
      const res = await apiClient.get(`/batches/${id}`);
      setBatch(res.data.data.batch);
    } catch (err) {
      console.error('Error fetching batch review details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading batch review workspace..." />;
  if (!batch) return <div className="alert alert-danger">Batch not found.</div>;

  const currentApprovals = batch.districtApprovals?.filter(
    (a) => a.submissionCycle === batch.submissionCycle && a.decision === 'APPROVED'
  ) || [];

  const alreadyApprovedByMe = currentApprovals.some((a) => a.officerId === user?.id);

  const handleAction = async () => {
    if (modalType !== 'APPROVE' && (!reason || !reason.trim())) {
      setModalError('Reason is mandatory for returning or rejecting a batch.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      if (modalType === 'APPROVE') {
        await apiClient.post(`/district/batches/${id}/approve`, { reason });
      } else if (modalType === 'RETURN') {
        await apiClient.post(`/district/batches/${id}/return`, { reason });
      } else if (modalType === 'REJECT') {
        await apiClient.post(`/district/batches/${id}/reject`, { reason });
      }

      setModalType(null);
      setReason('');
      await fetchBatch();
      navigate('/district/pending');
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link to="/district/pending" className="btn btn-outline-secondary btn-sm">
          <FaArrowLeft className="me-1" /> Back to Pending Batches
        </Link>
        <div className="d-flex gap-2">
          {!alreadyApprovedByMe && ['DISTRICT_REVIEW', 'SUBMITTED'].includes(batch.status) && (
            <>
              <button
                className="btn btn-outline-warning btn-sm"
                onClick={() => { setModalType('RETURN'); setReason(''); setModalError(''); }}
              >
                <FaExclamationTriangle className="me-1" /> Return for Corrections
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
                <FaCheckCircle className="me-1" /> Approve Batch (Sign Off)
              </button>
            </>
          )}

          {alreadyApprovedByMe && (
            <div className="badge bg-success fs-6 px-3 py-2">
              ✓ You have signed off on this batch. Waiting for second officer.
            </div>
          )}
        </div>
      </div>

      {/* Batch Overview Banner */}
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
              <span className="small text-muted d-block"><FaUserGraduate className="me-1" /> Total Candidates</span>
              <span className="fw-bold fs-6 text-primary">{batch.candidateCount} Trainees</span>
            </div>
            <div className="col-md-3">
              <span className="small text-muted d-block">District Approvals (Current Cycle {batch.submissionCycle})</span>
              <span className="badge bg-primary fs-6 px-2 py-1">
                {currentApprovals.length} of 2 Recorded
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Status Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3">
          <h6 className="fw-bold mb-0 text-dark">District Multi-Officer Verification Status</h6>
        </div>
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="p-3 border rounded bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">First District Officer Approval</span>
                  {currentApprovals[0] ? (
                    <span className="badge bg-success">Verified</span>
                  ) : (
                    <span className="badge bg-secondary">Pending</span>
                  )}
                </div>
                {currentApprovals[0] ? (
                  <div className="small text-secondary">
                    <div><strong>Officer:</strong> {currentApprovals[0].officer?.name}</div>
                    <div><strong>Remarks:</strong> {currentApprovals[0].reason}</div>
                    <div className="text-muted">{new Date(currentApprovals[0].createdAt).toLocaleString()}</div>
                  </div>
                ) : (
                  <div className="small text-muted">Awaiting first officer evaluation.</div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              <div className="p-3 border rounded bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Second District Officer Approval</span>
                  {currentApprovals[1] ? (
                    <span className="badge bg-success">Verified</span>
                  ) : (
                    <span className="badge bg-secondary">Pending</span>
                  )}
                </div>
                {currentApprovals[1] ? (
                  <div className="small text-secondary">
                    <div><strong>Officer:</strong> {currentApprovals[1].officer?.name}</div>
                    <div><strong>Remarks:</strong> {currentApprovals[1].reason}</div>
                    <div className="text-muted">{new Date(currentApprovals[1].createdAt).toLocaleString()}</div>
                  </div>
                ) : (
                  <div className="small text-muted">Awaiting second independent officer evaluation.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Verification Table */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3">
          <h5 className="fw-bold mb-0 text-dark">
            Candidates to Verify ({batch.candidates?.length || 0})
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

      {/* Action Modals */}
      <ConfirmationModal
        show={modalType !== null}
        title={
          modalType === 'APPROVE'
            ? 'Approve Training Batch'
            : modalType === 'RETURN'
            ? 'Return Batch for Corrections'
            : 'Reject Batch'
        }
        confirmText={
          modalType === 'APPROVE'
            ? 'Confirm Approval'
            : modalType === 'RETURN'
            ? 'Return to Centre'
            : 'Reject Batch'
        }
        confirmVariant={
          modalType === 'APPROVE'
            ? 'success'
            : modalType === 'RETURN'
            ? 'warning'
            : 'danger'
        }
        onConfirm={handleAction}
        onCancel={() => setModalType(null)}
      >
        {modalError && <div className="alert alert-danger py-2 small">{modalError}</div>}
        <div className="mb-3">
          <label className="form-label fw-bold text-dark small">
            {modalType === 'APPROVE'
              ? 'Officer Verification Remarks (Optional):'
              : 'Detailed Reason for Return / Rejection (Mandatory):'}
          </label>
          <textarea
            className="form-control"
            rows="3"
            placeholder={
              modalType === 'APPROVE'
                ? 'e.g. Verified attendance logs and training practical assessments.'
                : 'e.g. Candidate IDs in rows 4-6 must match government apprentice portal registration.'
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

export default DistrictBatchReview;
