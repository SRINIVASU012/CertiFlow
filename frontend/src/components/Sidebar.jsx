import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaChartPie,
  FaFolderPlus,
  FaListUl,
  FaFileAlt,
  FaCheckDouble,
  FaClipboardCheck,
  FaTasks,
  FaHistory,
  FaExclamationTriangle,
  FaUsersCog
} from 'react-icons/fa';

export const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  return (
    <div className="sidebar d-flex flex-column">
      <div className="px-3 mb-3">
        <span className="text-uppercase fw-bold text-muted small" style={{ letterSpacing: '0.8px' }}>
          {role.replace('_', ' ')} PORTAL
        </span>
      </div>

      <nav className="nav flex-column mb-auto">
        {/* Training Centre Navigation */}
        {role === 'TRAINING_CENTRE' && (
          <>
            <NavLink to="/centre/dashboard" className="nav-link">
              <FaChartPie className="me-2" /> Overview
            </NavLink>
            <NavLink to="/centre/batches/create" className="nav-link">
              <FaFolderPlus className="me-2" /> Create New Batch
            </NavLink>
            <NavLink to="/centre/batches" end className="nav-link">
              <FaListUl className="me-2" /> All Batches
            </NavLink>
            <NavLink to="/centre/returned" className="nav-link">
              <FaExclamationTriangle className="me-2 text-danger" /> Returned Batches
            </NavLink>
            <NavLink to="/centre/certificates" className="nav-link">
              <FaFileAlt className="me-2 text-success" /> Issued Certificates
            </NavLink>
          </>
        )}

        {/* District Officer Navigation */}
        {role === 'DISTRICT_OFFICER' && (
          <>
            <NavLink to="/district/dashboard" className="nav-link">
              <FaChartPie className="me-2" /> District Overview
            </NavLink>
            <NavLink to="/district/pending" className="nav-link">
              <FaTasks className="me-2 text-primary" /> Pending Batches
            </NavLink>
            <NavLink to="/district/history" className="nav-link">
              <FaHistory className="me-2" /> Review History
            </NavLink>
          </>
        )}

        {/* Quality Team Navigation */}
        {role === 'QUALITY_TEAM' && (
          <>
            <NavLink to="/quality/dashboard" className="nav-link">
              <FaChartPie className="me-2" /> Quality Overview
            </NavLink>
            <NavLink to="/quality/pending" className="nav-link">
              <FaClipboardCheck className="me-2 text-warning" /> Pending Inspections
            </NavLink>
            <NavLink to="/quality/history" className="nav-link">
              <FaHistory className="me-2" /> Inspection History
            </NavLink>
          </>
        )}

        {/* State Office Navigation */}
        {role === 'STATE_OFFICE' && (
          <>
            <NavLink to="/state/dashboard" className="nav-link">
              <FaChartPie className="me-2" /> State Command Center
            </NavLink>
            <NavLink to="/state/pending" className="nav-link">
              <FaCheckDouble className="me-2 text-success" /> Pending Final Approval
            </NavLink>
            <NavLink to="/state/batches" className="nav-link">
              <FaListUl className="me-2" /> All State Batches
            </NavLink>
            <NavLink to="/state/certificates" className="nav-link">
              <FaFileAlt className="me-2 text-primary" /> Certificate Registry
            </NavLink>
            <NavLink to="/state/delayed" className="nav-link">
              <FaExclamationTriangle className="me-2 text-warning" /> Delayed Batches
            </NavLink>
            <NavLink to="/state/audit" className="nav-link">
              <FaUsersCog className="me-2 text-secondary" /> System Audit Logs
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-top mt-auto bg-light">
        <div className="small text-muted">
          <div>Pragati Skills Engine</div>
          <div className="fw-semibold text-primary">v1.0.0 (Secure)</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
