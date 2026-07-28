/** Re-publish HLS job for a video that finished transcoding but missed HLS trigger */
const amqp = require('amqplib');

const videoId = process.argv[2];
if (!videoId) {
  console.error('Usage: node scripts/trigger-hls.js <videoId>');
  process.exit(1);
}

async function main() {
  const url = process.env.RABBITMQ_URL;
  if (!url) console.warn('WARNING: RABBITMQ_URL not set, using dev default');
  const conn = await amqp.connect(url || 'amqp://falcon:falcon_dev@localhost:5672');
  const ch = await conn.createChannel();
  const message = { videoId, resolutions: ['1080p', '720p', '480p'] };
  ch.sendToQueue('falcon.hls', Buffer.from(JSON.stringify(message)), { persistent: true });
  console.log('HLS job queued for', videoId);
  await ch.close();
  await conn.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
