import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FaTasks, FaCheckCircle, FaClock } from 'react-icons/fa';

export const PendingBatches = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await apiClient.get('/district/pending');
        setBatches(res.data.data.batches);
      } catch (err) {
        console.error('Error fetching pending district batches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  if (loading) return <LoadingSpinner message="Loading pending district reviews..." />;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">Batches Pending District Review</h3>
        <p className="text-muted small mb-0">
          Review trainee information, verify attendance criteria, and record your approval or return instructions.
        </p>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th>Batch Number</th>
                <th>Training Centre & Title</th>
                <th>Candidates</th>
                <th>Approvals Required</th>
                <th>Your Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link to={`/district/batches/${b.id}`} className="fw-bold text-primary text-decoration-none">
                      {b.batchNumber}
                    </Link>
                  </td>
                  <td>
                    <div className="fw-semibold text-dark">{b.batchName}</div>
                    <small className="text-muted">{b.trainingCentre?.name}</small>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border px-2 py-1">
                      {b.candidateCount} Candidates
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-info text-dark">
                      {b.currentApprovalsCount} / 2 Approved
                    </span>
                  </td>
                  <td>
                    {b.alreadyApprovedByMe ? (
                      <span className="badge bg-success bg-opacity-10 text-success border border-success">
                        ✓ Approved by you
                      </span>
                    ) : (
                      <span className="badge bg-warning text-dark border border-warning">
                        Action Required
                      </span>
                    )}
                  </td>
                  <td className="text-end">
                    <Link to={`/district/batches/${b.id}`} className="btn btn-sm btn-primary-navy">
                      Open Review Screen →
                    </Link>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    No pending batches waiting for district review.
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

export default PendingBatches;
