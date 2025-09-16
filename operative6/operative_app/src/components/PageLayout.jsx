"use client";
import RoleBasedNavbar from './RoleBasedNavbar';

export default function PageLayout({ children, title }) {
  return (
    <div className="min-h-screen bg-blue-100">
      <RoleBasedNavbar />
      
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Page Title */}
        {title && (
          <h1 className="text-2xl font-bold text-blue-800 mb-6 text-center">
            {title}
          </h1>
        )}
        
        {/* Main Content - Same size as job card form */}
        <div className="bg-white rounded-lg p-6 border border-blue-200">
          {children}
        </div>
      </div>
    </div>
  );
}