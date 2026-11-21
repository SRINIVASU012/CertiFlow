import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

export const ApprovalHistory = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await apiClient.get('/batches');
        setBatches(res.data.data.batches);
      } catch (err) {
        console.error('Error fetching approval history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <LoadingSpinner message="Loading review history..." />;

  // Filter batches where current user participated in districtApprovals
  const myReviewedBatches = batches.filter((b) =>
    b.districtApprovals?.some((a) => a.officerId === user?.id)
  );

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">District Officer Decision History</h3>
        <p className="text-muted small mb-0">Record of all previous approval, return, and rejection decisions you logged.</p>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th>Batch Number</th>
                <th>Training Centre</th>
                <th>Candidates</th>
                <th>Your Decision</th>
                <th>Decision Reason</th>
                <th>Current Status</th>
                <th className="text-end">Details</th>
              </tr>
            </thead>
            <tbody>
              {myReviewedBatches.map((b) => {
                const myDecision = b.districtApprovals.find((a) => a.officerId === user?.id);
                return (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/district/batches/${b.id}`} className="fw-bold text-primary text-decoration-none">
                        {b.batchNumber}
                      </Link>
                    </td>
                    <td>{b.trainingCentre?.name}</td>
                    <td><span className="badge bg-light text-dark border">{b.candidateCount}</span></td>
                    <td><StatusBadge status={myDecision?.decision} /></td>
                    <td className="small text-muted" style={{ maxWidth: '280px' }}>
                      {myDecision?.reason || 'Verified'}
                    </td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="text-end">
                      <Link to={`/district/batches/${b.id}`} className="btn btn-sm btn-outline-secondary">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {myReviewedBatches.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    No review history found.
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

export default ApprovalHistory;
