import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { FaFolderPlus, FaArrowLeft } from 'react-icons/fa';

export const CreateBatch = () => {
  const [batchName, setBatchName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [districts, setDistricts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await apiClient.get('/batches/metadata');
        setDistricts(res.data.data.districts);
        if (res.data.data.districts.length > 0) {
          setDistrictId(res.data.data.districts[0].id);
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await apiClient.post('/batches', {
        batchName,
        courseName,
        districtId
      });
      const created = res.data.data.batch;
      // Navigate directly to candidate upload for this batch
      navigate(`/centre/batches/${created.id}/upload`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create batch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid" style={{ maxWidth: '800px' }}>
      <button onClick={() => navigate(-1)} className="btn btn-outline-secondary btn-sm mb-3">
        <FaArrowLeft className="me-1" /> Back
      </button>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-primary-navy text-white py-3">
          <h4 className="fw-bold mb-0 d-flex align-items-center">
            <FaFolderPlus className="me-2 text-warning" /> Create New Training Batch
          </h4>
        </div>
        <div className="card-body p-4">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Batch Name / Cohort Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Solar Electrician Technician - Cohort 3"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                required
              />
              <div className="form-text">Choose a descriptive title for easy tracking.</div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Course / Qualification Programme *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Solar Photovoltaic Installer"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Governing District *</label>
              <select
                className="form-select"
                value={districtId}
                onChange={(e) => setDistrictId(e.target.value)}
                required
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code}) - {d.state}
                  </option>
                ))}
              </select>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => navigate('/centre/dashboard')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary-navy px-4"
                disabled={submitting}
              >
                {submitting ? 'Creating Batch...' : 'Proceed to Candidate Upload →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateBatch;
