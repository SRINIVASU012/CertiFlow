import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  FaArrowLeft,
  FaFileUpload,
  FaPaperPlane,
  FaRedo,
  FaExclamationTriangle,
  FaCheckCircle,
  FaHistory,
  FaFilePdf
} from 'react-icons/fa';

export const BatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  const fetchBatch = async () => {
    try {
      const res = await apiClient.get(`/batches/${id}`);
      setBatch(res.data.data.batch);
      setAuditLogs(res.data.data.auditLogs);
    } catch (err) {
      console.error('Error fetching batch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiClient.post(`/batches/${id}/submit`);
      await fetchBatch();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to submit batch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      await apiClient.post(`/batches/${id}/resubmit`);
      await fetchBatch();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to resubmit batch.');
    } finally {
      setResubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading batch details..." />;
  if (!batch) return <div className="alert alert-danger">Batch not found.</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link to="/centre/batches" className="btn btn-outline-secondary btn-sm">
          <FaArrowLeft className="me-1" /> Back to Batch List
        </Link>
        <div className="d-flex gap-2">
          {batch.status === 'DRAFT' && (
            <>
              <Link to={`/centre/batches/${batch.id}/upload`} className="btn btn-outline-primary btn-sm">
                <FaFileUpload className="me-1" /> Upload / Replace Candidates
              </Link>
              {batch.candidates?.length > 0 && (
                <button
                  onClick={handleSubmit}
                  className="btn btn-success btn-sm px-3 fw-semibold"
                  disabled={submitting}
                >
                  <FaPaperPlane className="me-1" />
                  {submitting ? 'Submitting...' : 'Submit Batch for Review'}
                </button>
              )}
            </>
          )}

          {batch.status === 'RETURNED' && (
            <>
              <Link to={`/centre/batches/${batch.id}/upload`} className="btn btn-outline-danger btn-sm">
                <FaFileUpload className="me-1" /> Re-upload Corrected Spreadsheet
              </Link>
              <button
                onClick={handleResubmit}
                className="btn btn-danger btn-sm px-3 fw-semibold"
                disabled={resubmitting}
              >
                <FaRedo className="me-1" />
                {resubmitting ? 'Resubmitting...' : 'Resubmit Corrected Batch'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Return Warning Banner */}
      {batch.status === 'RETURNED' && (
        <div className="alert alert-danger shadow-sm border-danger mb-4">
          <h5 className="alert-heading fw-bold d-flex align-items-center">
            <FaExclamationTriangle className="me-2" /> Returned for Correction
          </h5>
          <p className="mb-2"><strong>Reason given by Officer:</strong> {batch.returnReason}</p>
          <small className="text-dark">
            Policy Note: You can correct candidate information and click "Resubmit". A new submission cycle will be created. Past approval records are preserved for audit accountability.
          </small>
        </div>
      )}

      {/* Rejection Banner */}
      {batch.status === 'REJECTED' && (
        <div className="alert alert-dark shadow-sm border-danger mb-4">
          <h5 className="alert-heading fw-bold text-danger d-flex align-items-center">
            <FaExclamationTriangle className="me-2" /> Batch Rejected
          </h5>
          <p className="mb-0"><strong>Rejection Reason:</strong> {batch.rejectionReason}</p>
        </div>
      )}

      {/* Batch Overview Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-primary-navy text-white py-3 d-flex justify-content-between align-items-center">
          <div>
            <h4 className="fw-bold mb-0">{batch.batchNumber}</h4>
            <span className="text-light opacity-75 small">{batch.batchName}</span>
          </div>
          <div>
            <StatusBadge status={batch.status} />
          </div>
        </div>

        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-4">
              <span className="small text-muted d-block">Course / Qualification</span>
              <strong className="text-dark">{batch.courseName}</strong>
            </div>
            <div className="col-md-4">
              <span className="small text-muted d-block">Training Centre</span>
              <span className="fw-semibold text-secondary">{batch.trainingCentre?.name}</span>
            </div>
            <div className="col-md-4">
              <span className="small text-muted d-block">District</span>
              <span className="fw-semibold text-secondary">{batch.district?.name}</span>
            </div>
            <div className="col-md-4">
              <span className="small text-muted d-block">Submission Cycle</span>
              <span className="badge bg-light text-dark border px-2 py-1">Cycle {batch.submissionCycle}</span>
            </div>
            <div className="col-md-4">
              <span className="small text-muted d-block">Candidates Enrolled</span>
              <span className="fw-bold fs-6 text-primary">{batch.candidateCount} Candidates</span>
            </div>
            <div className="col-md-4">
              <span className="small text-muted d-block">Last Updated</span>
              <span className="text-muted small">{new Date(batch.lastActionAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Approval & Review History Tracker */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">
                District Approvals ({batch.districtApprovals?.length || 0})
              </h6>
              <span className="badge bg-light text-secondary border">2 Officers Required</span>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {batch.districtApprovals?.map((a) => (
                  <li key={a.id} className="list-group-item p-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold text-dark">{a.officer?.name}</span>
                      <StatusBadge status={a.decision} />
                    </div>
                    <div className="small text-muted mb-1">{a.reason}</div>
                    <div className="d-flex justify-content-between small text-secondary">
                      <span>Submission Cycle {a.submissionCycle}</span>
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
                {(!batch.districtApprovals || batch.districtApprovals.length === 0) && (
                  <li className="list-group-item py-4 text-center text-muted small">
                    No district reviews recorded yet.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">Quality Review Records</h6>
              <span className="badge bg-light text-secondary border">Batches ≥ 50</span>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {batch.qualityReviews?.map((q) => (
                  <li key={q.id} className="list-group-item p-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold text-dark">{q.reviewer?.name}</span>
                      <StatusBadge status={q.decision} />
                    </div>
                    <div className="small text-muted mb-1">{q.reason}</div>
                    <div className="d-flex justify-content-between small text-secondary">
                      <span>Submission Cycle {q.submissionCycle}</span>
                      <span>{new Date(q.createdAt).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
                {(!batch.qualityReviews || batch.qualityReviews.length === 0) && (
                  <li className="list-group-item py-4 text-center text-muted small">
                    {batch.candidateCount >= 50
                      ? 'Quality review pending inspection.'
                      : 'Quality review not required (Cohort < 50 candidates).'}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate List Table */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark">
            Candidates in Batch ({batch.candidates?.length || 0})
          </h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-secondary">
                <tr>
                  <th>ID</th>
                  <th>Candidate Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Completion Date</th>
                  <th>Certificate No.</th>
                  <th>Download</th>
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
                    <td>
                      {c.certificate ? (
                        <Link to={`/verify/${c.certificate.certificateNumber}`} className="fw-bold text-success text-decoration-none">
                          {c.certificate.certificateNumber}
                        </Link>
                      ) : (
                        <span className="text-muted">Not Issued</span>
                      )}
                    </td>
                    <td>
                      {c.certificate && (
                        <a
                          href={`http://localhost:5000/api/certificates/${c.certificate.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-primary"
                        >
                          <FaFilePdf className="me-1" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {(!batch.candidates || batch.candidates.length === 0) && (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No candidates in this batch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <h6 className="fw-bold mb-0 text-dark d-flex align-items-center">
            <FaHistory className="me-2 text-primary" /> Permanent Batch Audit Log
          </h6>
        </div>
        <div className="card-body p-0">
          <ul className="list-group list-group-flush small">
            {auditLogs.map((log) => (
              <li key={log.id} className="list-group-item d-flex justify-content-between align-items-start py-2">
                <div>
                  <strong className="text-dark me-2">{log.action}</strong>
                  <span className="text-muted">by {log.user?.name || 'System Worker'} ({log.userRole || 'SYSTEM'})</span>
                  {log.reason && <p className="mb-0 text-secondary italic small">"{log.reason}"</p>}
                </div>
                <span className="text-muted small">{new Date(log.timestamp).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BatchDetails;
