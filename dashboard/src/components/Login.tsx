import React from 'react';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            WDAI Hive Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the dashboard
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <div className="text-center">
            <p className="text-gray-600">
              Authentication will be implemented with Slack Sign-In
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 