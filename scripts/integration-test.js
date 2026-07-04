/**
 * Falcon end-to-end integration test
 * Tests: upload init → chunks → complete → metadata → progress
 */
const API = 'http://localhost:3000';
const CHUNK_SIZE = 5 * 1024 * 1024;

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `${path} failed: ${res.status}`);
  return body;
}

async function createTestVideo() {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  const { execSync } = await import('child_process');

  const tmpDir = path.join(os.tmpdir(), 'falcon-test');
  const videoPath = path.join(tmpDir, 'test-video.mp4');

  if (fs.existsSync(videoPath)) {
    return videoPath;
  }

  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  try {
    execSync(
      `ffmpeg -y -f lavfi -i testsrc=duration=3:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=3 -c:v libx264 -c:a aac -shortest "${videoPath}"`,
      { stdio: 'pipe' }
    );
    return videoPath;
  } catch {
    try {
      execSync(
        `docker run --rm -v "${tmpDir.replace(/\\/g, '/')}:/out" linuxserver/ffmpeg -y -f lavfi -i testsrc=duration=3:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=3 -c:v libx264 -c:a aac -shortest /out/test-video.mp4`,
        { stdio: 'pipe', shell: true }
      );
      return fs.existsSync(videoPath) ? videoPath : null;
    } catch {
      return null;
    }
  }
}

async function uploadVideo(filePath) {
  const fs = await import('fs');
  const buffer = fs.readFileSync(filePath);
  const fileName = 'test-video.mp4';
  const fileSize = buffer.length;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  const session = await api('/api/upload/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Falcon E2E Test',
      description: 'Automated integration test video',
      fileName,
      fileSize,
      chunkSize: CHUNK_SIZE,
      totalChunks,
    }),
  });

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const chunk = buffer.subarray(start, Math.min(start + CHUNK_SIZE, fileSize));
    const form = new FormData();
    form.append('sessionId', session.sessionId);
    form.append('chunkIndex', String(i));
    form.append('chunk', new Blob([chunk]), `chunk-${i}`);

    await api('/api/upload/chunk', { method: 'POST', body: form });
  }

  const result = await api('/api/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: session.sessionId }),
  });

  return result;
}

async function waitForProgress(videoId, maxWaitSec = 120) {
  const start = Date.now();
  while (Date.now() - start < maxWaitSec * 1000) {
    try {
      const progress = await api(`/api/notifications/progress/${videoId}`);
      process.stdout.write(`\r  Progress: ${progress.progress}% | 1080p:${progress['1080p'] ? '✓' : '·'} 720p:${progress['720p'] ? '✓' : '·'} 480p:${progress['480p'] ? '·' : '·'} | ${progress.status}   `);

      if (progress.status === 'COMPLETED') {
        return progress;
      }
      if (progress.status === 'FAILED') {
        return progress;
      }
    } catch {
      // progress not ready yet
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

async function main() {

  // 1. Health
  const health = await api('/health');
  const services = [
    ['Upload', 'http://localhost:3011/health'],
    ['Metadata', 'http://localhost:3002/health'],
    ['HLS', 'http://localhost:3003/health'],
    ['Notification', 'http://localhost:3004/health'],
    ['Worker', 'http://localhost:3005/health'],
  ];

  for (const [name, url] of services) {
    const res = await fetch(url);
  }

  // 2. Metadata
  const videos = await api('/api/videos');

  // 3. Upload test
  const videoPath = await createTestVideo();

  if (videoPath) {
    const result = await uploadVideo(videoPath);

    // 4. Verify in metadata
    const video = await api(`/api/videos/${result.videoId}`);

    // 5. Wait for transcoding
    await waitForProgress(result.videoId, 180);

    const final = await api(`/api/videos/${result.videoId}`);
    if (final.status === 'COMPLETED' && final.hls_master_url) {
    }
  }
}

main().catch((err) => {
  process.exit(1);
});
