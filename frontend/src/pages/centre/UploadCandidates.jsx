import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  FaFileUpload,
  FaFileExcel,
  FaDownload,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowLeft,
  FaPaperPlane
} from 'react-icons/fa';

export const UploadCandidates = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [submittingBatch, setSubmittingBatch] = useState(false);

  const fetchBatch = async () => {
    try {
      const res = await apiClient.get(`/batches/${id}`);
      setBatch(res.data.data.batch);
    } catch (err) {
      console.error('Error fetching batch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [id]);

  // Generate and download sample CSV/Excel spreadsheet matching requirements
  const handleDownloadSample = () => {
    const headers = [
      'Candidate Identifier',
      'Candidate Name',
      'Candidate Email',
      'Mobile Number',
      'Course Name',
      'Training Completion Date'
    ];

    const rows = [
      ['CAND-2026-001', 'Aarav Sharma', 'aarav.sharma@example.com', '+919876543210', batch?.courseName || 'Solar Electrician Technician', '2026-02-28'],
      ['CAND-2026-002', 'Sneha Patil', 'sneha.patil@example.com', '+919876543211', batch?.courseName || 'Solar Electrician Technician', '2026-02-28'],
      ['CAND-2026-003', 'Rajesh Kumar', 'rajesh.kumar@example.com', '+919876543212', batch?.courseName || 'Solar Electrician Technician', '2026-02-28']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CertiFlow_Sample_Candidates_${batch?.batchNumber || 'Batch'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setValidationErrors([]);
    setSuccessMessage('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setValidationErrors([]);
    setSuccessMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post(`/batches/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessMessage(res.data.message);
      await fetchBatch();
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.error?.errors) {
        setValidationErrors(err.response.data.error.errors);
      } else {
        setValidationErrors([
          {
            row: '-',
            field: 'Upload',
            message: err.response?.data?.error?.message || 'Upload failed.'
          }
        ]);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitBatch = async () => {
    setSubmittingBatch(true);
    try {
      await apiClient.post(`/batches/${id}/submit`);
      navigate(`/centre/batches/${id}`);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to submit batch.');
    } finally {
      setSubmittingBatch(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading batch details..." />;

  return (
    <div className="container-fluid" style={{ maxWidth: '960px' }}>
      <Link to={`/centre/batches/${id}`} className="btn btn-outline-secondary btn-sm mb-3">
        <FaArrowLeft className="me-1" /> Back to Batch Details
      </Link>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-primary-navy text-white py-3 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="fw-bold mb-0">Upload Candidate Spreadsheet</h5>
            <small className="text-light opacity-75">{batch?.batchNumber} • {batch?.batchName}</small>
          </div>
          <button onClick={handleDownloadSample} className="btn btn-outline-light btn-sm d-flex align-items-center">
            <FaDownload className="me-1" /> Download CSV Template
          </button>
        </div>

        <div className="card-body p-4">
          <p className="text-muted small">
            Upload an Excel (.xlsx or .xls) file containing certified candidate records.
            The platform executes strict atomic validation — all candidate records must be completely valid for the upload to succeed.
          </p>

          {/* Upload Form */}
          <form onSubmit={handleUpload} className="mb-4">
            <div className="p-4 border border-2 border-dashed rounded bg-light text-center mb-3">
              <FaFileExcel className="text-success mb-2" size={40} />
              <h6>Select Spreadsheet File</h6>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="form-control mx-auto mt-2"
                style={{ maxWidth: '400px' }}
                required
              />
            </div>

            <div className="d-flex justify-content-between align-items-center">
              <span className="small text-muted">
                {file ? `Selected file: ${file.name}` : 'No file selected yet'}
              </span>
              <button
                type="submit"
                className="btn btn-primary-navy px-4"
                disabled={!file || uploading}
              >
                <FaFileUpload className="me-2" />
                {uploading ? 'Validating & Importing...' : 'Upload & Validate Spreadsheet'}
              </button>
            </div>
          </form>

          {/* Success Message */}
          {successMessage && (
            <div className="alert alert-success d-flex align-items-center mb-4">
              <FaCheckCircle className="me-2 fs-5" />
              <div>
                <strong>Success: </strong> {successMessage}
              </div>
            </div>
          )}

          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="card border-danger mb-4 shadow-sm">
              <div className="card-header bg-danger text-white py-2 d-flex justify-content-between align-items-center">
                <span className="fw-bold d-flex align-items-center">
                  <FaExclamationTriangle className="me-2" /> Validation Errors ({validationErrors.length})
                </span>
                <span className="small bg-white text-danger px-2 py-0.5 rounded fw-semibold">
                  No partial data was saved
                </span>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive" style={{ maxHeight: '280px' }}>
                  <table className="table table-sm table-striped align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th style={{ width: '80px' }}>Row</th>
                        <th style={{ width: '180px' }}>Field</th>
                        <th>Error Description & Correction</th>
                      </tr>
                    </thead>
                    <tbody className="small">
                      {validationErrors.map((err, idx) => (
                        <tr key={idx}>
                          <td className="fw-bold text-danger">Row {err.row}</td>
                          <td className="fw-semibold">{err.field}</td>
                          <td>{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Batch Candidates Preview */}
          {batch?.candidates?.length > 0 && (
            <div className="card border-0 bg-light p-3 mt-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 text-dark">
                  Imported Candidates ({batch.candidates.length})
                </h6>
                {batch.status === 'DRAFT' && (
                  <button
                    onClick={handleSubmitBatch}
                    className="btn btn-success btn-sm px-3 fw-semibold"
                    disabled={submittingBatch}
                  >
                    <FaPaperPlane className="me-1" />
                    {submittingBatch ? 'Submitting...' : 'Submit Batch for District Review'}
                  </button>
                )}
              </div>

              <div className="table-responsive bg-white rounded shadow-sm">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light small">
                    <tr>
                      <th>ID</th>
                      <th>Candidate Name</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Completion Date</th>
                    </tr>
                  </thead>
                  <tbody className="small">
                    {batch.candidates.map((c) => (
                      <tr key={c.id}>
                        <td><code>{c.candidateIdentifier}</code></td>
                        <td className="fw-bold">{c.name}</td>
                        <td>{c.email}</td>
                        <td>{c.mobileNumber}</td>
                        <td>{new Date(c.completionDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadCandidates;
