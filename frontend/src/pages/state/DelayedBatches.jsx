import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FaClock, FaExclamationTriangle, FaBell } from 'react-icons/fa';

export const DelayedBatches = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDelayed = async () => {
      try {
        const res = await apiClient.get('/state/delayed');
        setBatches(res.data.data.batches);
      } catch (err) {
        console.error('Error fetching delayed batches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDelayed();
  }, []);

  if (loading) return <LoadingSpinner message="Scanning for delayed batches..." />;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1 d-flex align-items-center">
          <FaClock className="me-2 text-warning" /> Delayed Batch Escalation Monitor
        </h3>
        <p className="text-muted small mb-0">
          Batches that have remained pending in District, Quality, or State review queues for over 24 hours without administrative action.
        </p>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th>Batch Number</th>
                <th>Training Centre</th>
                <th>District</th>
                <th>Candidates</th>
                <th>Current Status</th>
                <th>Pending Duration</th>
                <th className="text-end">Action</th>
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
                  <td>{b.trainingCentre?.name}</td>
                  <td>{b.district?.name}</td>
                  <td><span className="badge bg-light text-dark border">{b.candidateCount}</span></td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1 fw-bold">
                      <FaExclamationTriangle className="me-1" /> {b.delayedHours} hours pending
                    </span>
                  </td>
                  <td className="text-end">
                    <Link to={`/centre/batches/${b.id}`} className="btn btn-sm btn-outline-primary">
                      Inspect Batch
                    </Link>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    🎉 No delayed batches! All reviews are currently within the 24-hour SLA threshold.
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

export default DelayedBatches;
