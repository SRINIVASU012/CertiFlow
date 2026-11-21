import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FaHistory, FaFilter, FaSearch, FaUserShield } from 'react-icons/fa';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = async () => {
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      const res = await apiClient.get('/audit-logs', { params });
      setLogs(res.data.data.auditLogs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  if (loading) return <LoadingSpinner message="Loading system audit log..." />;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1 d-flex align-items-center">
          <FaHistory className="me-2 text-primary" /> Immutable System Audit Registry
        </h3>
        <p className="text-muted small mb-0">
          Permanent chronological log of all administrative actions, batch decisions, certificate generations, and cancellations.
        </p>
      </div>

      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-md-4">
            <select
              className="form-select form-select-sm"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Audit Actions</option>
              <option value="LOGIN">User Logins</option>
              <option value="BATCH_CREATED">Batch Creation</option>
              <option value="CANDIDATES_UPLOADED">Candidates Upload</option>
              <option value="BATCH_SUBMITTED">Batch Submissions</option>
              <option value="DISTRICT_APPROVED">District Approvals</option>
              <option value="DISTRICT_REJECTED">District Rejections</option>
              <option value="BATCH_RETURNED">Batch Returns</option>
              <option value="QUALITY_APPROVED">Quality Approvals</option>
              <option value="STATE_APPROVED">State Approvals</option>
              <option value="CERTIFICATE_GENERATED">Certificate Generation</option>
              <option value="CERTIFICATE_CANCELLED">Certificate Cancellation</option>
              <option value="NOTIFICATION_SENT">WhatsApp Sent</option>
              <option value="NOTIFICATION_FAILED">WhatsApp Failed</option>
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">All Entities</option>
              <option value="BATCH">Batches</option>
              <option value="CERTIFICATE">Certificates</option>
              <option value="NOTIFICATION">Notifications</option>
              <option value="USER">Users</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Performed By</th>
                <th>Status Transition</th>
                <th>Reason / Metadata</th>
              </tr>
            </thead>
            <tbody className="small">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="text-nowrap text-muted">{new Date(l.timestamp).toLocaleString()}</td>
                  <td>
                    <span className="badge bg-light text-dark border fw-bold">
                      {l.action}
                    </span>
                  </td>
                  <td>
                    <code>{l.entityType}:{l.entityId?.slice(0, 8)}...</code>
                  </td>
                  <td>
                    <div className="fw-bold">{l.user?.name || 'System Worker'}</div>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                      {l.userRole || 'SYSTEM'}
                    </span>
                  </td>
                  <td>
                    {l.previousStatus || l.newStatus ? (
                      <span className="text-secondary">
                        {l.previousStatus || '—'} → <strong>{l.newStatus}</strong>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ maxWidth: '320px' }}>
                    {l.reason && <div className="text-dark fw-semibold">"{l.reason}"</div>}
                    {l.metadata && (
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {JSON.stringify(l.metadata)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    No audit records found matching selected filters.
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

export default AuditLogs;
