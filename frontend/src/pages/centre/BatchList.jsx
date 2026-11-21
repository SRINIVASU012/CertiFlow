import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FaSearch, FaFilter, FaFolderPlus } from 'react-icons/fa';

export const BatchList = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBatches = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await apiClient.get('/batches', { params });
      setBatches(res.data.data.batches);
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBatches();
  };

  if (loading) return <LoadingSpinner message="Loading training batches..." />;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">All Training Batches</h3>
          <p className="text-muted small mb-0">Browse, monitor progress, and manage submissions across all batches.</p>
        </div>
        <Link to="/centre/batches/create" className="btn btn-primary-navy d-flex align-items-center">
          <FaFolderPlus className="me-2" /> Create New Batch
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <form onSubmit={handleSearch} className="row g-2 align-items-center">
          <div className="col-md-6 col-lg-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light"><FaSearch className="text-muted" /></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by batch number, title or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-primary-navy">Search</button>
            </div>
          </div>
          <div className="col-md-4 col-lg-3">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light"><FaFilter className="text-muted" /></span>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="DISTRICT_REVIEW">District Review</option>
                <option value="QUALITY_REVIEW">Quality Review</option>
                <option value="STATE_REVIEW">State Review</option>
                <option value="APPROVED">Approved</option>
                <option value="COMPLETED">Completed</option>
                <option value="RETURNED">Returned</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Batches Table */}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th>Batch Number</th>
                <th>Title & Qualification</th>
                <th>Candidates</th>
                <th>District</th>
                <th>Status</th>
                <th>Submission Cycle</th>
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
                  <td>
                    <div className="fw-semibold text-dark">{b.batchName}</div>
                    <small className="text-muted">{b.courseName}</small>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border px-2 py-1">
                      {b.candidateCount} Candidates
                    </span>
                  </td>
                  <td className="small text-secondary">{b.district?.name}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td><span className="badge bg-light text-secondary border">Cycle {b.submissionCycle}</span></td>
                  <td className="text-end">
                    <Link to={`/centre/batches/${b.id}`} className="btn btn-sm btn-outline-primary">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    No batches found matching selected filters.
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

export default BatchList;
