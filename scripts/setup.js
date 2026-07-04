const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🦅 Setting up Falcon...\n');

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// Check Docker
try {
  run('docker info', { stdio: 'pipe' });
  console.log('✓ Docker is available');
  run('docker compose up -d');
  console.log('✓ Infrastructure started (PostgreSQL, Redis, RabbitMQ, MinIO)\n');
  console.log('  Waiting for services to be healthy...');
  execSync('timeout /t 12 /nobreak', { stdio: 'inherit', shell: true });
} catch {
  console.log('⚠ Docker not available — start Docker Desktop, then run: docker compose up -d\n');
}

console.log('Installing dependencies...');
run('npm install');

if (fs.existsSync(path.join(__dirname, '../.env'))) {
  console.log('✓ .env file found');
} else {
  fs.copyFileSync(path.join(__dirname, '../.env.example'), path.join(__dirname, '../.env'));
  console.log('✓ Created .env from .env.example');
}

console.log('Running database migrations...');
try {
  run('npm run db:migrate');
  console.log('✓ Database migrated\n');
} catch {
  console.log('⚠ Migration failed — ensure PostgreSQL is running\n');
}

console.log('Building project...');
run('npm run build');
console.log('✓ Build successful\n');

console.log('═══════════════════════════════════════');
console.log('  Falcon is ready!');
console.log('═══════════════════════════════════════');
console.log('');
console.log('  Start everything:  npm run dev:all');
console.log('  Backend only:      npm run dev');
console.log('  Frontend only:     npm run dev:frontend');
console.log('  Health check:      npm run verify');
console.log('');
console.log('  Frontend:       http://localhost:5173');
console.log('  API Gateway:    http://localhost:3000');
console.log('  RabbitMQ UI:    http://localhost:15672');
console.log('  MinIO Console:  http://localhost:9001');
console.log('');
