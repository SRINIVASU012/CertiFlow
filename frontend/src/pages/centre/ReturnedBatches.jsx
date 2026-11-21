import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

export const ReturnedBatches = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReturned = async () => {
      try {
        const res = await apiClient.get('/batches', { params: { status: 'RETURNED' } });
        setBatches(res.data.data.batches);
      } catch (err) {
        console.error('Error fetching returned batches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReturned();
  }, []);

  if (loading) return <LoadingSpinner message="Loading returned batches..." />;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-danger mb-1 d-flex align-items-center">
          <FaExclamationTriangle className="me-2" /> Returned Batches Requiring Correction
        </h3>
        <p className="text-muted small mb-0">
          These batches were sent back by District Officers or the Quality Team with specific correction instructions.
        </p>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th>Batch Number</th>
                <th>Batch Title</th>
                <th>Candidates</th>
                <th>Return Reason / Feedback</th>
                <th>Cycle</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link to={`/centre/batches/${b.id}`} className="fw-bold text-danger text-decoration-none">
                      {b.batchNumber}
                    </Link>
                  </td>
                  <td>
                    <div className="fw-semibold text-dark">{b.batchName}</div>
                    <small className="text-muted">{b.courseName}</small>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border px-2 py-1">
                      {b.candidateCount} Candidates
                    </span>
                  </td>
                  <td>
                    <div className="text-danger small fw-semibold" style={{ maxWidth: '350px' }}>
                      "{b.returnReason}"
                    </div>
                  </td>
                  <td><span className="badge bg-light text-secondary border">Cycle {b.submissionCycle}</span></td>
                  <td className="text-end">
                    <Link to={`/centre/batches/${b.id}`} className="btn btn-sm btn-danger d-inline-flex align-items-center">
                      <FaRedo className="me-1" /> Correct & Resubmit
                    </Link>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    🎉 Excellent! No returned batches currently pending your correction.
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

export default ReturnedBatches;
