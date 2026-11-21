import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound = () => (
  <div className="container text-center py-5">
    <div className="card shadow-sm p-5 mx-auto" style={{ maxWidth: '500px' }}>
      <h1 className="display-4 fw-bold text-secondary">404</h1>
      <h4 className="fw-bold text-dark">Page Not Found</h4>
      <p className="text-muted">The requested CertiFlow resource does not exist or has been relocated.</p>
      <Link to="/" className="btn btn-primary-navy mt-2">
        Return Home
      </Link>
    </div>
  </div>
);

export default NotFound;
