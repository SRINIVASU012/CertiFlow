import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FaClipboardCheck, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export const QualityDashboard = () => {
  const [pendingBatches, setPendingBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await apiClient.get('/quality/pending');
        setPendingBatches(res.data.data.batches);
      } catch (err) {
        console.error('Error fetching quality overview:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  if (loading) return <LoadingSpinner message="Loading Quality Review Command..." />;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">Quality Review Team Dashboard</h3>
        <p className="text-muted small mb-0">
          Independent Quality Scrutiny for large batches (threshold: 50+ candidates).
          Ensures high standards of training delivery before state final certification.
        </p>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="metric-card p-3 border-warning">
            <span className="metric-title d-flex align-items-center"><FaClipboardCheck className="me-1 text-warning" /> Pending Inspections</span>
            <div className="metric-value text-warning">{pendingBatches.length}</div>
            <small className="text-muted">Cohorts meeting large-batch inspection criteria</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="metric-card p-3">
            <span className="metric-title">Quality Threshold</span>
            <div className="metric-value text-primary">50+</div>
            <small className="text-muted">Candidates per cohort requiring scrutiny</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaCheckCircle className="me-1 text-success" /> Inspection Target</span>
            <div className="metric-value text-success">100%</div>
            <small className="text-muted">Compliance before State final sign-off</small>
          </div>
        </div>
      </div>

      {/* Pending Table */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark">Cohorts Requiring Quality Inspection</h5>
          <span className="badge bg-warning text-dark px-2 py-1">Action Required</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-secondary">
                <tr>
                  <th>Batch Number</th>
                  <th>Training Centre & Title</th>
                  <th>Candidate Count</th>
                  <th>District Review Completed</th>
                  <th>Current Status</th>
                  <th className="text-end">Inspection</th>
                </tr>
              </thead>
              <tbody>
                {pendingBatches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/quality/batches/${b.id}`} className="fw-bold text-primary text-decoration-none">
                        {b.batchNumber}
                      </Link>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{b.batchName}</div>
                      <small className="text-muted">{b.trainingCentre?.name}</small>
                    </td>
                    <td>
                      <span className="badge bg-warning text-dark px-2 py-1 fs-6">
                        {b.candidateCount} Candidates
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-success bg-opacity-10 text-success border border-success">
                        ✓ 2 of 2 District Approvals Done
                      </span>
                    </td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="text-end">
                      <Link to={`/quality/batches/${b.id}`} className="btn btn-sm btn-primary-navy">
                        Inspect Cohort →
                      </Link>
                    </td>
                  </tr>
                ))}
                {pendingBatches.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      No large cohorts currently pending quality inspection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityDashboard;
