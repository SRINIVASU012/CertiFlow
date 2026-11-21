import React from 'react';

export const ConfirmationModal = ({
  show,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  children
}) => {
  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold text-dark">{title}</h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          <div className="modal-body">
            {message && <p className="text-secondary">{message}</p>}
            {children}
          </div>
          <div className="modal-footer border-top">
            <button type="button" className="btn btn-secondary btn-sm px-3" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className={`btn btn-${confirmVariant} btn-sm px-3 fw-semibold`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
