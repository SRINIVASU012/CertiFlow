import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { FaTasks, FaCheckCircle, FaExclamationTriangle, FaClock } from 'react-icons/fa';

export const DistrictDashboard = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await apiClient.get('/district/pending');
        setBatches(res.data.data.batches);
      } catch (err) {
        console.error('Error fetching district overview:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  if (loading) return <LoadingSpinner message="Loading District Officer Dashboard..." />;

  const pendingCount = batches.length;
  const waitingForMe = batches.filter((b) => !b.alreadyApprovedByMe).length;
  const approvedByMe = batches.filter((b) => b.alreadyApprovedByMe).length;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">District Officer Portal</h3>
        <p className="text-muted small mb-0">
          Signed in as: <strong>{user?.name}</strong> • Two different district officers must approve each batch before it advances.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="metric-card p-3 border-primary">
            <span className="metric-title d-flex align-items-center"><FaTasks className="me-1 text-primary" /> Pending Action By You</span>
            <div className="metric-value text-primary">{waitingForMe}</div>
            <small className="text-muted">Batches waiting for your official sign-off</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaClock className="me-1 text-warning" /> Total District Pending</span>
            <div className="metric-value text-warning">{pendingCount}</div>
            <small className="text-muted">Total batches in district review queue</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaCheckCircle className="me-1 text-success" /> Approved By You (Cycle)</span>
            <div className="metric-value text-success">{approvedByMe}</div>
            <small className="text-muted">Awaiting second district officer sign-off</small>
          </div>
        </div>
      </div>

      {/* Pending Batches Table */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark">Batches Pending District Action</h5>
          <Link to="/district/pending" className="btn btn-sm btn-outline-primary">View Full List</Link>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-secondary">
                <tr>
                  <th>Batch Number</th>
                  <th>Training Centre & Title</th>
                  <th>Candidates</th>
                  <th>Approvals Recorded</th>
                  <th>Your Review Status</th>
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
                    <td><span className="badge bg-light text-dark border px-2 py-1">{b.candidateCount} Candidates</span></td>
                    <td>
                      <span className="badge bg-info text-dark px-2 py-1">
                        {b.currentApprovalsCount} of 2 Approved
                      </span>
                    </td>
                    <td>
                      {b.alreadyApprovedByMe ? (
                        <span className="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1">
                          ✓ Signed Off By You
                        </span>
                      ) : (
                        <span className="badge bg-warning bg-opacity-25 text-dark border border-warning px-2 py-1">
                          Pending Your Sign-Off
                        </span>
                      )}
                    </td>
                    <td className="text-end">
                      <Link to={`/district/batches/${b.id}`} className="btn btn-sm btn-primary-navy">
                        Inspect & Review →
                      </Link>
                    </td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      No pending batches currently awaiting district review.
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

export default DistrictDashboard;
