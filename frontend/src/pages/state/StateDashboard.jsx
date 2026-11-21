import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  FaCheckDouble,
  FaFileAlt,
  FaTimesCircle,
  FaExclamationTriangle,
  FaLayerGroup,
  FaPaperPlane,
  FaClock
} from 'react-icons/fa';

export const StateDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiClient.get('/state/dashboard');
        setMetrics(res.data.data.metrics);
      } catch (err) {
        console.error('Error fetching state metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <LoadingSpinner message="Loading State Command Center..." />;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">State Office Command Center</h3>
          <p className="text-muted small mb-0">Pragati Skills Mission • Final Certification & Policy Authority</p>
        </div>
        <Link to="/state/pending" className="btn btn-primary-navy d-flex align-items-center">
          <FaCheckDouble className="me-2 text-warning" /> Pending Final Approvals
        </Link>
      </div>

      {/* Metrics Row 1: Workflow Operations */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaLayerGroup className="me-1 text-primary" /> Total System Batches</span>
            <div className="metric-value">{metrics?.totalBatches}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card p-3 border-success">
            <span className="metric-title d-flex align-items-center"><FaCheckDouble className="me-1 text-success" /> Pending Final Sign-Off</span>
            <div className="metric-value text-success">{metrics?.pendingFinalApproval}</div>
            <small className="text-muted">Awaiting Farah's State Approval</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaFileAlt className="me-1 text-primary" /> Approved / Certified</span>
            <div className="metric-value text-primary">{metrics?.approvedBatches}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaTimesCircle className="me-1 text-danger" /> Total Rejected</span>
            <div className="metric-value text-danger">{metrics?.rejectedBatches}</div>
          </div>
        </div>
      </div>

      {/* Metrics Row 2: Certificates & Monitoring */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="metric-card p-3">
            <span className="metric-title">Total Certificates Issued</span>
            <div className="metric-value text-dark">{metrics?.totalCertificates}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card p-3 border-danger">
            <span className="metric-title d-flex align-items-center"><FaTimesCircle className="me-1 text-danger" /> Revoked / Cancelled</span>
            <div className="metric-value text-danger">{metrics?.cancelledCertificates}</div>
            <small className="text-muted">Immediately invalid on public verify</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card p-3 border-warning">
            <span className="metric-title d-flex align-items-center"><FaClock className="me-1 text-warning" /> Delayed Batches (&gt;24h)</span>
            <div className="metric-value text-warning">{metrics?.delayedBatches}</div>
            <small className="text-muted"><Link to="/state/delayed" className="text-decoration-none">Inspect Delayed →</Link></small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card p-3">
            <span className="metric-title d-flex align-items-center"><FaPaperPlane className="me-1 text-secondary" /> Notification Failures</span>
            <div className="metric-value text-secondary">{metrics?.notificationFailures}</div>
            <small className="text-muted">WhatsApp delivery failure monitor</small>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="row g-3">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100 p-3 bg-white">
            <h6 className="fw-bold text-dark mb-1">Final Approval Queue</h6>
            <p className="small text-muted mb-3">
              Review batches that successfully cleared multi-officer district reviews and quality audits.
            </p>
            <Link to="/state/pending" className="btn btn-outline-success btn-sm mt-auto">
              Open Approval Queue →
            </Link>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100 p-3 bg-white">
            <h6 className="fw-bold text-dark mb-1">Certificate Registry & Revocation</h6>
            <p className="small text-muted mb-3">
              Search all issued credentials and execute official revocations with mandatory audit reasoning.
            </p>
            <Link to="/state/certificates" className="btn btn-outline-primary btn-sm mt-auto">
              Manage Certificate Registry →
            </Link>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100 p-3 bg-white">
            <h6 className="fw-bold text-dark mb-1">System Audit & Traceability</h6>
            <p className="small text-muted mb-3">
              Immutable log of every login, spreadsheet upload, district decision, quality review, and certificate generation.
            </p>
            <Link to="/state/audit" className="btn btn-outline-secondary btn-sm mt-auto">
              View Audit Trail →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateDashboard;
