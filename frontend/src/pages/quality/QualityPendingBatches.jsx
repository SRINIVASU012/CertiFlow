import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

export const QualityPendingBatches = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await apiClient.get('/quality/pending');
        setBatches(res.data.data.batches);
      } catch (err) {
        console.error('Error fetching quality pending batches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  if (loading) return <LoadingSpinner message="Loading pending quality reviews..." />;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">Batches Pending Quality Inspection</h3>
        <p className="text-muted small mb-0">Cohorts containing 50 or more candidates routed automatically for quality validation.</p>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th>Batch Number</th>
                <th>Training Centre & Title</th>
                <th>Trainee Size</th>
                <th>District Approvals</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link to={`/quality/batches/${b.id}`} className="fw-bold text-primary text-decoration-none">
                      {b.batchNumber}
                    </Link>
                  </td>
                  <td>
                    <div className="fw-semibold text-dark">{b.batchName}</div>
                    <small className="text-muted">{b.courseName}</small>
                  </td>
                  <td>
                    <span className="badge bg-warning text-dark px-2 py-1 fw-bold">
                      {b.candidateCount} Candidates
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-success bg-opacity-10 text-success border border-success">
                      ✓ 2 District Approvals
                    </span>
                  </td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="text-end">
                    <Link to={`/quality/batches/${b.id}`} className="btn btn-sm btn-primary-navy">
                      Open Inspection Workspace →
                    </Link>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    No batches waiting for quality review.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QualityPendingBatches;
