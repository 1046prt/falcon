/** Re-publish HLS job for a video that finished transcoding but missed HLS trigger */
const amqp = require('amqplib');

const videoId = process.argv[2];
if (!videoId) {
  console.error('Usage: node scripts/trigger-hls.js <videoId>');
  process.exit(1);
}

async function main() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://falcon:falcon_secret@localhost:5672');
  const ch = await conn.createChannel();
  const message = { videoId, resolutions: ['1080p', '720p', '480p'] };
  ch.sendToQueue('falcon.hls', Buffer.from(JSON.stringify(message)), { persistent: true });
  console.log('HLS job queued for', videoId);
  await ch.close();
  await conn.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
