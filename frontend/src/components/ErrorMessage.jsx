import React from 'react';

export const ErrorMessage = ({ message, onRetry }) => (
  <div className="alert alert-danger d-flex justify-content-between align-items-center my-3" role="alert">
    <div>
      <h6 className="alert-heading mb-1 fw-bold">Operation Error</h6>
      <p className="mb-0 small">{message || 'An unexpected error occurred.'}</p>
    </div>
    {onRetry && (
      <button className="btn btn-sm btn-outline-danger" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

export default ErrorMessage;
