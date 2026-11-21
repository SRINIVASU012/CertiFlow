import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { FaBell, FaCheckCircle, FaTrash } from 'react-icons/fa';

export const NotificationPanel = () => {
  const { notifications, connected, clearNotifications } = useSocket();
  const [open, setOpen] = useState(false);

  return (
    <div className="position-relative me-3">
      <button
        className="btn btn-sm btn-outline-light position-relative d-flex align-items-center"
        onClick={() => setOpen(!open)}
        title={connected ? 'Live Feed Connected' : 'Connecting to Live Feed...'}
      >
        <FaBell className="me-1" />
        <span
          className={`position-absolute top-0 start-100 translate-middle p-1 border border-light rounded-circle ${
            connected ? 'bg-success' : 'bg-warning'
          }`}
          style={{ width: '10px', height: '10px' }}
        ></span>
        {notifications.length > 0 && (
          <span className="badge bg-danger ms-1" style={{ fontSize: '0.65rem' }}>
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="card position-absolute end-0 mt-2 shadow-lg"
          style={{ width: '320px', zIndex: 1050, maxHeight: '400px' }}
        >
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
            <span className="small fw-bold">Live Updates ({notifications.length})</span>
            {notifications.length > 0 && (
              <button
                className="btn btn-link text-white btn-sm p-0"
                onClick={clearNotifications}
                title="Clear All"
              >
                <FaTrash size={12} />
              </button>
            )}
          </div>
          <div className="card-body p-2 overflow-auto" style={{ maxHeight: '320px' }}>
            {notifications.length === 0 ? (
              <div className="text-center py-4 text-muted small">
                <FaCheckCircle className="text-success mb-2" size={24} />
                <p className="mb-0">No new notifications. Connected to live updates.</p>
              </div>
            ) : (
              <ul className="list-group list-group-flush">
                {notifications.map((n) => (
                  <li key={n.id} className="list-group-item px-2 py-2 small border-bottom">
                    <p className="mb-1 text-dark">{n.text}</p>
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {n.timestamp}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
