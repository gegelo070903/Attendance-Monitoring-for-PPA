const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return '';
  return process.argv[index + 1] || '';
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function getLocalIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push(net.address);
      }
    }
  }

  if (candidates.length === 0) return '127.0.0.1';
  const preferred = candidates.find((address) => {
    return (
      address.startsWith('192.168.') ||
      address.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
    );
  });

  return preferred || candidates[0];
}

function parseEnv(content) {
  const map = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = line.indexOf('=');
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    map[key] = value;
  }

  return map;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return parseEnv(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function isUrlLike(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.hostname);
  } catch {
    return false;
  }
}

function getProtocol(cwd) {
  try {
    const certDir = path.join(cwd, 'certs');
    const hasCert = fs.existsSync(path.join(certDir, 'cert.pem'));
    const hasKey = fs.existsSync(path.join(certDir, 'key.pem'));
    return hasCert && hasKey ? 'https' : 'http';
  } catch {
    return 'http';
  }
}

function buildEnv(map, targetName) {
  const lines = [];
  lines.push(`# Auto-generated ${targetName} (scripts/generate-env.js)`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('NEXTAUTH_SECRET=' + (map.NEXTAUTH_SECRET || ''));
  lines.push('NEXTAUTH_URL=' + (map.NEXTAUTH_URL || ''));
  lines.push('NEXTAUTH_VPN_URL=' + (map.NEXTAUTH_VPN_URL || ''));
  lines.push('VPN_URL=' + (map.VPN_URL || ''));
  lines.push('PUBLIC_IP=' + (map.PUBLIC_IP || ''));
  lines.push('PUBLIC_HOSTNAME=' + (map.PUBLIC_HOSTNAME || ''));
  lines.push('');

  const reserved = new Set([
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'NEXTAUTH_VPN_URL',
    'VPN_URL',
    'PUBLIC_IP',
    'PUBLIC_HOSTNAME',
  ]);

  const extraKeys = Object.keys(map).filter((key) => !reserved.has(key)).sort();
  for (const key of extraKeys) {
    lines.push(`${key}=${map[key]}`);
  }

  return lines.join(os.EOL) + os.EOL;
}

async function askValue(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer || '').trim());
    });
  });
}

async function main() {
  const cwd = process.cwd();
  const targetName = getArgValue('--target') || '.env.local';
  const targetPath = path.join(cwd, targetName);
  const envLocalPath = path.join(cwd, '.env.local');
  const envPath = path.join(cwd, '.env');
  const baseMap = {
    ...readEnvFile(envPath),
    ...readEnvFile(envLocalPath),
    ...readEnvFile(targetPath),
  };

  if (!baseMap.NEXTAUTH_SECRET) {
    baseMap.NEXTAUTH_SECRET = crypto.randomBytes(32).toString('base64');
    console.log('Generated NEXTAUTH_SECRET');
  }

  const protocol = getProtocol(cwd);
  const localIp = getLocalIp();
  const autoUrl = `${protocol}://${localIp}:3000`;

  const explicitUrl = getArgValue('--url').trim();
  if (explicitUrl) {
    if (!isUrlLike(explicitUrl)) {
      console.error('Invalid --url value. Expected full URL like https://192.168.1.10:3000');
      process.exit(1);
    }
    baseMap.NEXTAUTH_URL = explicitUrl;
  } else if (!baseMap.NEXTAUTH_URL || !isUrlLike(baseMap.NEXTAUTH_URL)) {
    baseMap.NEXTAUTH_URL = autoUrl;
  }

  const explicitVpnUrl = getArgValue('--vpn-url').trim();
  if (explicitVpnUrl) {
    baseMap.NEXTAUTH_VPN_URL = explicitVpnUrl;
  } else if (!baseMap.NEXTAUTH_VPN_URL && baseMap.VPN_URL) {
    baseMap.NEXTAUTH_VPN_URL = baseMap.VPN_URL;
  }

  const noPrompt = hasFlag('--no-prompt');
  const forcePrompt = hasFlag('--prompt');
  const shouldPromptVpn =
    !baseMap.NEXTAUTH_VPN_URL &&
    !noPrompt &&
    process.stdin.isTTY &&
    (forcePrompt || hasFlag('--interactive'));

  if (shouldPromptVpn) {
    const answer = await askValue('Enter VPN URL for remote access (or leave blank): ');
    if (answer) {
      baseMap.NEXTAUTH_VPN_URL = answer;
    }
  }

  baseMap.VPN_URL = baseMap.NEXTAUTH_VPN_URL || '';
  baseMap.PUBLIC_IP = baseMap.PUBLIC_IP || localIp;

  fs.writeFileSync(targetPath, buildEnv(baseMap, targetName), 'utf8');
  console.log(`${targetName} written.`);
  console.log('NEXTAUTH_URL=' + baseMap.NEXTAUTH_URL);
  if (baseMap.NEXTAUTH_VPN_URL) {
    console.log('NEXTAUTH_VPN_URL=' + baseMap.NEXTAUTH_VPN_URL);
  } else {
    console.log('NEXTAUTH_VPN_URL is empty (set later if needed).');
  }
}

main().catch((error) => {
  console.error('Failed to generate environment file:', error?.message || error);
  process.exit(1);
});
