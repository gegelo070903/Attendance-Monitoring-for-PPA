const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const certDir = path.join(__dirname, 'certs');
const certPath = path.join(certDir, 'cert.pem');
const keyPath = path.join(certDir, 'key.pem');
const shouldForceRegenerate = process.argv.includes('--force') || process.env.FORCE_REGENERATE_CERT === '1';
const initialEnvKeys = new Set(Object.keys(process.env));

loadEnvFiles();

// Skip if certs already exist
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  if (shouldForceRegenerate) {
    fs.unlinkSync(certPath);
    fs.unlinkSync(keyPath);
    console.log('Existing SSL certificates removed. Regenerating...');
  } else {
  console.log('SSL certificates already exist in ./certs/');
  process.exit(0);
  }
}

function loadEnvFiles() {
  const envFiles = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.production.local',
  ];

  for (const envFile of envFiles) {
    const envPath = path.join(__dirname, envFile);
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      if (!key || initialEnvKeys.has(key)) {
        continue;
      }

      let value = trimmedLine.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

// Get all local IPv4 addresses for the certificate
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = ['127.0.0.1'];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

function getConfiguredHosts() {
  const hosts = [];
  const addHost = (value) => {
    if (!value) {
      return;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue || hosts.includes(normalizedValue)) {
      return;
    }

    hosts.push(normalizedValue);
  };

  addHost(process.env.PUBLIC_IP);
  addHost(process.env.PUBLIC_HOSTNAME);

  if (process.env.NEXTAUTH_URL) {
    try {
      const parsedUrl = new URL(process.env.NEXTAUTH_URL);
      addHost(parsedUrl.hostname);
    } catch {
      console.warn('Skipping NEXTAUTH_URL host in certificate: invalid URL format.');
    }
  }

  return hosts;
}

function isIPv4Address(value) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value);
}

const localIPs = getLocalIPs();
const configuredHosts = getConfiguredHosts();
const certificateHosts = [...new Set([...localIPs, ...configuredHosts])];
console.log('Generating SSL certificate for hosts:', certificateHosts.join(', '));

// Generate using Node.js built-in crypto
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Build Subject Alternative Names (SANs)
const sanEntries = ['DNS:localhost'];
certificateHosts.forEach((host) => {
  if (host === 'localhost') {
    return;
  }

  if (isIPv4Address(host)) {
    sanEntries.push(`IP:${host}`);
    return;
  }

  sanEntries.push(`DNS:${host}`);
});

// Create OpenSSL config for self-signed cert with SANs
const opensslConf = path.join(certDir, 'openssl.cnf');

if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

fs.writeFileSync(keyPath, privateKey);

const confContent = `[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
CN = PPA Attendance System

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
subjectAltName = ${sanEntries.join(',')}
`;

fs.writeFileSync(opensslConf, confContent);

// Try using OpenSSL if available, otherwise use Node's built-in createSign
try {
  execSync(
    `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 3650 -config "${opensslConf}"`,
    { stdio: 'pipe' }
  );
  fs.unlinkSync(opensslConf);
  console.log('SSL certificates generated using OpenSSL in ./certs/');
  console.log('Certificate valid for 10 years.');
} catch {
  // OpenSSL not available — generate a basic self-signed cert with Node.js crypto
  fs.unlinkSync(opensslConf);
  console.log('OpenSSL not found, generating certificate with Node.js crypto...');
  
  const cert = crypto.createSign('SHA256');
  // Use node:tls experimental self-signed cert generation via X509Certificate
  // Fallback: generate a minimal ASN.1 DER self-signed certificate
  generateSelfSignedCert(privateKey, publicKey, certificateHosts);
}

function generateSelfSignedCert(privKey, pubKey, hosts) {
  // For Node.js without OpenSSL CLI, we generate using spawn with inline openssl
  // or use a pure JS approach. Since we have Node 24, use the experimental generateCertificate
  try {
    // Node 24+ has crypto.createCertificateRequest (but may not be stable)
    // Best fallback: write a small script that uses forge
    const forge = requireForge();
    if (forge) {
      generateWithForge(forge, privKey, hosts);
      return;
    }
  } catch (error) {
    console.error('node-forge certificate generation failed:', error instanceof Error ? error.stack : error);
  }

  // Ultimate fallback: tell user to install OpenSSL
  console.error('');
  console.error('Could not generate SSL certificate automatically.');
  console.error('Please install OpenSSL for Windows:');
  console.error('  https://slproweb.com/products/Win32OpenSSL.html');
  console.error('Then run this script again: node generate-cert.js');
  // Clean up
  if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
  process.exit(1);
}

function requireForge() {
  try { return require('node-forge'); } catch { return null; }
}

function generateWithForge(forge, privKeyPem, hosts) {
  const pki = forge.pki;
  const keys = { privateKey: pki.privateKeyFromPem(privKeyPem) };
  keys.publicKey = pki.setRsaPublicKey(keys.privateKey.n, keys.privateKey.e);
  
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
  
  const attrs = [{ name: 'commonName', value: 'PPA Attendance System' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  
  const altNames = [];
  const seenHosts = new Set();

  hosts.forEach((host) => {
    if (!host || seenHosts.has(host)) {
      return;
    }

    seenHosts.add(host);

    if (isIPv4Address(host)) {
      altNames.push({ type: 7, ip: host });
      return;
    }

    altNames.push({ type: 2, value: host });
  });
  
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'subjectAltName', altNames },
  ]);
  
  cert.sign(keys.privateKey, forge.md.sha256.create());
  
  fs.writeFileSync(certPath, pki.certificateToPem(cert));
  console.log('SSL certificates generated using node-forge in ./certs/');
  console.log('Certificate valid for 10 years.');
}
