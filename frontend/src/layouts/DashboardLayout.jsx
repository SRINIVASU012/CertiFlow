import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export const DashboardLayout = ({ children }) => {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <div className="container-fluid flex-grow-1 p-0">
        <div className="row g-0 flex-nowrap min-vh-100">
          <div className="col-auto col-md-3 col-xl-2 px-0 bg-white">
            <Sidebar />
          </div>
          <main className="col py-4 px-md-4 px-3 bg-light overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
