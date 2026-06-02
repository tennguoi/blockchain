import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import VerifyPage from './pages/VerifyPage';
import AdminDashboard from './pages/AdminDashboard';
import StudentPortal from './pages/StudentPortal';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes with Navbar and Footer */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Protected Routes with Sidebar */}
          <Route element={<DashboardLayout />}>
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/*" 
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentPortal />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
        <Toaster 
          position="top-right" 
          toastOptions={{
            className: 'text-sm font-medium',
            style: {
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '12px 16px',
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
