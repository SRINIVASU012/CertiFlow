import React from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt } from 'react-icons/fa';

export const Unauthorized = () => (
  <div className="container text-center py-5">
    <div className="card shadow-sm p-5 mx-auto" style={{ maxWidth: '500px' }}>
      <FaShieldAlt className="text-danger mx-auto mb-3" size={54} />
      <h3 className="fw-bold text-danger">Access Restricted</h3>
      <p className="text-muted">
        Your logged in role does not have authorization to access this administrative portal view.
      </p>
      <Link to="/" className="btn btn-primary-navy mt-2">
        Return to Portal
      </Link>
    </div>
  </div>
);

export default Unauthorized;
