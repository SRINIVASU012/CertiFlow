import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FaFolderPlus, FaFileAlt, FaCheckCircle, FaExclamationTriangle, FaClock, FaLayerGroup } from 'react-icons/fa';

export const CentreDashboard = () => {
  const [batches, setBatches] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchRes, certRes] = await Promise.all([
          apiClient.get('/batches'),
          apiClient.get('/certificates')
        ]);
        setBatches(batchRes.data.data.batches);
        setCertificates(certRes.data.data.certificates);
      } catch (err) {
        console.error('Error loading centre dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner message="Loading Centre Overview..." />;

  const totalBatches = batches.length;
  const draftBatches = batches.filter((b) => b.status === 'DRAFT').length;
  const pendingBatches = batches.filter((b) =>
    ['SUBMITTED', 'DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_REVIEW'].includes(b.status)
  ).length;
  const approvedBatches = batches.filter((b) => ['APPROVED', 'COMPLETED'].includes(b.status)).length;
  const returnedBatches = batches.filter((b) => b.status === 'RETURNED').length;
  const totalCertificates = certificates.length;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Training Centre Dashboard</h3>
          <p className="text-muted small mb-0">Manage training batches, upload candidates, and track approval workflows.</p>
        </div>
        <Link to="/centre/batches/create" className="btn btn-primary-navy d-flex align-items-center">
          <FaFolderPlus className="me-2" /> Create New Batch
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="row g-3 mb-4">
        <div className="col-md-4 col-lg-2">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaLayerGroup className="me-1 text-primary" /> Total</span>
            <div className="metric-value">{totalBatches}</div>
          </div>
        </div>
        <div className="col-md-4 col-lg-2">
          <div className="metric-card p-3">
            <span className="metric-title">Drafts</span>
            <div className="metric-value text-secondary">{draftBatches}</div>
          </div>
        </div>
        <div className="col-md-4 col-lg-2">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaClock className="me-1 text-warning" /> In Review</span>
            <div className="metric-value text-warning">{pendingBatches}</div>
          </div>
        </div>
        <div className="col-md-4 col-lg-2">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaCheckCircle className="me-1 text-success" /> Approved</span>
            <div className="metric-value text-success">{approvedBatches}</div>
          </div>
        </div>
        <div className="col-md-4 col-lg-2">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaExclamationTriangle className="me-1 text-danger" /> Returned</span>
            <div className="metric-value text-danger">{returnedBatches}</div>
          </div>
        </div>
        <div className="col-md-4 col-lg-2">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaFileAlt className="me-1 text-primary" /> Issued Certs</span>
            <div className="metric-value text-primary">{totalCertificates}</div>
          </div>
        </div>
      </div>

      {/* Recent Batches Table */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark">Recent Training Batches</h5>
          <Link to="/centre/batches" className="btn btn-sm btn-outline-primary">
            View All Batches
          </Link>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-secondary small">
                <tr>
                  <th>Batch Number</th>
                  <th>Batch & Course Name</th>
                  <th>Candidates</th>
                  <th>Status</th>
                  <th>Cycle</th>
                  <th>Last Updated</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.slice(0, 6).map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/centre/batches/${b.id}`} className="fw-bold text-primary text-decoration-none">
                        {b.batchNumber}
                      </Link>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{b.batchName}</div>
                      <small className="text-muted">{b.courseName}</small>
                    </td>
                    <td><span className="badge bg-light text-dark border px-2 py-1">{b.candidateCount} Candidates</span></td>
                    <td><StatusBadge status={b.status} /></td>
                    <td><span className="badge bg-light text-secondary">Cycle {b.submissionCycle}</span></td>
                    <td className="small text-muted">{new Date(b.updatedAt).toLocaleDateString()}</td>
                    <td className="text-end">
                      <Link to={`/centre/batches/${b.id}`} className="btn btn-sm btn-outline-secondary">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No batches created yet. Click "Create New Batch" to get started.
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

export default CentreDashboard;
