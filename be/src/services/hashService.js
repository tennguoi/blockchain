import crypto from 'crypto';

const normalizeString = (value) => `${value ?? ''}`.trim();

const canonicalStringify = (value) => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(',')}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`)
    .join(',')}}`;
};

export const buildCertificateMetadata = (certificate, fileCid) => ({
  certificateCode: normalizeString(certificate.certificateId),
  studentCode: normalizeString(certificate.studentId),
  studentName: normalizeString(certificate.studentName),
  universityName: normalizeString(certificate.universityName),
  degree: normalizeString(certificate.degree),
  major: normalizeString(certificate.major),
  graduationYear: normalizeString(certificate.graduationYear),
  gpa: normalizeString(certificate.gpa),
  fileCid: normalizeString(fileCid),
});

export const createCertificateHash = (metadata) =>
  crypto
    .createHash('sha256')
    .update(canonicalStringify(metadata), 'utf8')
    .digest('hex');

export const createIpHash = (ipAddress) => {
  if (!ipAddress) {
    return null;
  }

  return crypto
    .createHash('sha256')
    .update(`${process.env.IP_HASH_SALT || 'dev-ip-salt'}:${ipAddress}`, 'utf8')
    .digest('hex');
};
