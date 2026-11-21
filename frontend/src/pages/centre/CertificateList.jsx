import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FaFilePdf, FaSearch, FaCheckCircle } from 'react-icons/fa';

export const CertificateList = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCertificates = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      const res = await apiClient.get('/certificates', { params });
      setCertificates(res.data.data.certificates);
    } catch (err) {
      console.error('Error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCertificates();
  };

  if (loading) return <LoadingSpinner message="Loading issued certificates..." />;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">Issued Candidate Certificates</h3>
        <p className="text-muted small mb-0">Official digitally certified qualifications issued for your training centre.</p>
      </div>

      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <form onSubmit={handleSearch} className="row g-2 align-items-center">
          <div className="col-md-6">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light"><FaSearch className="text-muted" /></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search candidate name or certificate number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-primary-navy">Search</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th>Certificate Number</th>
                <th>Candidate Name</th>
                <th>Course</th>
                <th>Issue Date</th>
                <th>Status</th>
                <th className="text-end">Download PDF</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((c) => (
                <tr key={c.id}>
                  <td>
                    <a
                      href={`/verify/${c.certificateNumber}`}
                      target="_blank"
                      rel="noreferrer"
                      className="fw-bold text-primary text-decoration-none"
                    >
                      {c.certificateNumber}
                    </a>
                  </td>
                  <td>
                    <div className="fw-semibold text-dark">{c.candidate?.name}</div>
                    <small className="text-muted">{c.candidate?.email}</small>
                  </td>
                  <td className="small text-secondary">{c.candidate?.courseName}</td>
                  <td className="small text-muted">{new Date(c.issueDate).toLocaleDateString()}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="text-end">
                    <a
                      href={`http://localhost:5000/api/certificates/${c.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-outline-primary"
                    >
                      <FaFilePdf className="me-1" /> PDF
                    </a>
                  </td>
                </tr>
              ))}
              {certificates.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    No issued certificates found.
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

export default CertificateList;
