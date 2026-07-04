const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🦅 Starting Falcon...\n');

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true });
}

if (!fs.existsSync(path.join(__dirname, '../.env'))) {
  fs.copyFileSync(path.join(__dirname, '../.env.example'), path.join(__dirname, '../.env'));
}

try {
  run('docker compose up -d');
  console.log('\nStarting FFmpeg workers (Docker)...');
  run('docker compose -f docker-compose.yml -f docker-compose.workers.yml up -d');
} catch {
  console.error('Docker failed — ensure Docker Desktop is running');
  process.exit(1);
}

console.log('\nStarting backend + frontend...\n');
console.log('  Frontend:    http://localhost:5173');
console.log('  API Gateway: http://localhost:3000');
console.log('  MinIO:       http://localhost:9001');
console.log('  RabbitMQ:    http://localhost:15672\n');

spawn('npm run dev:all', { stdio: 'inherit', shell: true, cwd: path.join(__dirname, '..') });
