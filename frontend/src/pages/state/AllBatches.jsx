import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FaSearch, FaFilter } from 'react-icons/fa';

export const AllBatches = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBatches = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await apiClient.get('/state/batches', { params });
      setBatches(res.data.data.batches);
    } catch (err) {
      console.error('Error fetching state batches:', err);
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

  if (loading) return <LoadingSpinner message="Loading all state batches..." />;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">State Batch Registry</h3>
        <p className="text-muted small mb-0">System-wide monitoring of all training batches across districts and training centres.</p>
      </div>

      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <form onSubmit={handleSearch} className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light"><FaSearch className="text-muted" /></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search batch number, title, or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-primary-navy">Search</button>
            </div>
          </div>
          <div className="col-md-3">
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

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th>Batch Number</th>
                <th>Training Centre</th>
                <th>District</th>
                <th>Candidates</th>
                <th>Status</th>
                <th>Cycle</th>
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
                    <div className="fw-semibold text-dark">{b.trainingCentre?.name}</div>
                    <small className="text-muted">{b.courseName}</small>
                  </td>
                  <td>{b.district?.name}</td>
                  <td><span className="badge bg-light text-dark border">{b.candidateCount} Candidates</span></td>
                  <td><StatusBadge status={b.status} /></td>
                  <td><span className="badge bg-light text-secondary border">Cycle {b.submissionCycle}</span></td>
                  <td className="text-end">
                    <Link to={`/centre/batches/${b.id}`} className="btn btn-sm btn-outline-secondary">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AllBatches;
