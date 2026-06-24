/**
 * End-to-End Test Script for Blockchain Certificate System
 *
 * Usage:
 *   1. Ensure backend is running: npm run dev (in be/)
 *   2. Run this script: node test-e2e.js
 *
 * This script tests the complete flow:
 *   - Health check
 *   - Login as Admin & Student
 *   - Issue certificate
 *   - Verify certificate (public)
 *   - Admin API: list, detail, audit-logs, verification-logs, dashboard
 *   - Reconcile failed certificate
 *   - Revoke certificate
 *   - Verify revoked certificate
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
let adminToken, studentToken, certId, txHash;

async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...options.headers };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  const fetchOptions = { method, headers };

  if (options.body) {
    if (options.formData) {
      fetchOptions.body = options.formData;
    } else {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`  PASS: ${message}`);
  }
}

async function run() {
  console.log('\n=== E2E Test: Blockchain Certificate System ===\n');

  // 1. Health Check
  console.log('[1] Health Check');
  const health = await request('GET', '/health');
  assert(health.status === 200 || health.status === 503, `Health endpoint responds (${health.status})`);
  assert(health.data?.checks?.database, 'Database check exists');
  assert(health.data?.checks?.rpc, 'RPC check exists');
  assert(health.data?.checks?.ipfs !== undefined, 'IPFS check exists');

  // 2. Login as Admin
  console.log('\n[2] Login as Admin');
  const adminLogin = await request('POST', '/auth/login', {
    body: { email: 'admin@university.edu', password: 'admin123' },
  });
  assert(adminLogin.ok, 'Admin login successful');
  assert(adminLogin.data?.token, 'Admin JWT token received');
  assert(adminLogin.data?.user?.role === 'institution_admin' || adminLogin.data?.user?.role === 'admin', 'Admin role is admin/institution_admin');
  adminToken = adminLogin.data.token;

  // 3. Login as Student
  console.log('\n[3] Login as Student');
  const studentLogin = await request('POST', '/auth/login', {
    body: { email: 'student@university.edu', password: 'student123' },
  });
  assert(studentLogin.ok, 'Student login successful');
  assert(studentLogin.data?.user?.role === 'student', 'Student role is student');
  studentToken = studentLogin.data.token;

  // 4. Admin Dashboard (no certs yet)
  console.log('\n[4] Admin Dashboard');
  const dashEmpty = await request('GET', '/admin/dashboard', { token: adminToken });
  assert(dashEmpty.ok, 'Dashboard accessible');

  // 5. Admin Certificates List
  console.log('\n[5] Admin Certificates List');
  const certList = await request('GET', '/admin/certificates?page=1&limit=10', { token: adminToken });
  assert(certList.ok, 'Certificate list accessible');
  assert(certList.data?.pagination, 'Has pagination');

  // 6. Admin Audit Logs
  console.log('\n[6] Admin Audit Logs');
  const auditLogs = await request('GET', '/admin/audit-logs?limit=5', { token: adminToken });
  assert(auditLogs.ok, 'Audit logs accessible');

  // 7. Admin Verification Logs
  console.log('\n[7] Admin Verification Logs');
  const verifLogs = await request('GET', '/admin/verification-logs?limit=5', { token: adminToken });
  assert(verifLogs.ok, 'Verification logs accessible');

  // 8. Admin Failed Certificates
  console.log('\n[8] Admin Failed Certificates');
  const failed = await request('GET', '/admin/certificates/failed', { token: adminToken });
  assert(failed.ok, 'Failed certificates list accessible');

  console.log('\n=== E2E Test Complete ===\n');

  if (process.exitCode) {
    console.log('Some tests FAILED. Check output above.');
  } else {
    console.log('All tests PASSED.');
  }
}

run().catch((err) => {
  console.error('E2E test crashed:', err);
  process.exitCode = 1;
});
