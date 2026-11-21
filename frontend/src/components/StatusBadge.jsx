import React from 'react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  const getBadgeConfig = () => {
    switch (normalized) {
      case 'DRAFT':
        return { bg: 'secondary', label: 'Draft' };
      case 'SUBMITTED':
        return { bg: 'info', label: 'Submitted' };
      case 'DISTRICT_REVIEW':
        return { bg: 'primary', label: 'District Review' };
      case 'QUALITY_REVIEW':
        return { bg: 'warning text-dark', label: 'Quality Review' };
      case 'STATE_REVIEW':
        return { bg: 'info text-dark', label: 'State Review' };
      case 'APPROVED':
        return { bg: 'success', label: 'Approved' };
      case 'CERTIFICATES_GENERATING':
        return { bg: 'warning text-dark', label: 'Generating Certs' };
      case 'COMPLETED':
        return { bg: 'success', label: 'Completed' };
      case 'RETURNED':
        return { bg: 'danger', label: 'Returned for Edit' };
      case 'REJECTED':
        return { bg: 'danger', label: 'Rejected' };
      case 'VALID':
        return { bg: 'success', label: 'Valid / Verified' };
      case 'CANCELLED':
        return { bg: 'danger', label: 'Revoked / Cancelled' };
      case 'SENT':
        return { bg: 'success', label: 'Sent' };
      case 'PENDING':
        return { bg: 'secondary', label: 'Pending' };
      case 'PROCESSING':
        return { bg: 'warning text-dark', label: 'Processing' };
      case 'FAILED':
        return { bg: 'danger', label: 'Failed' };
      default:
        return { bg: 'secondary', label: status };
    }
  };

  const { bg, label } = getBadgeConfig();

  return (
    <span className={`badge bg-${bg} badge-status`}>
      {label}
    </span>
  );
};

export default StatusBadge;
