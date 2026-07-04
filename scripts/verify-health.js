const SERVICES = [
  { name: 'API Gateway', url: 'http://localhost:3000/health' },
  { name: 'Upload Service', url: 'http://localhost:3011/health' },
  { name: 'Metadata Service', url: 'http://localhost:3002/health' },
  { name: 'HLS Service', url: 'http://localhost:3003/health' },
  { name: 'Notification Service', url: 'http://localhost:3004/health' },
  { name: 'Transcoding Worker', url: 'http://localhost:3005/health' },
];

const INFRA = [
  { name: 'Frontend', url: 'http://localhost:5173' },
];

async function check(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n🦅 Falcon Health Check\n');

  let allOk = true;

  for (const svc of SERVICES) {
    const ok = await check(svc.url);
    console.log(`  ${ok ? '✅' : '❌'} ${svc.name}`);
    if (!ok) allOk = false;
  }

  console.log('');
  for (const svc of INFRA) {
    const ok = await check(svc.url);
    console.log(`  ${ok ? '✅' : '⚠️ '} ${svc.name}${ok ? '' : ' (optional — run npm run dev:frontend)'}`);
  }

  console.log('');
  if (allOk) {
    console.log('All backend services are healthy.\n');
    process.exit(0);
  } else {
    console.log('Some services are down. Run: docker compose up -d && npm run dev\n');
    process.exit(1);
  }
}

main();
