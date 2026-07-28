import amqp, { Channel, ChannelModel } from 'amqplib';
import { config } from './config';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const dlxExchange = 'falcon.dlx';

async function setupQueueWithDlq(queue: string): Promise<void> {
  const ch = channel!;
  const dlq = `${queue}.dlq`;
  const retryQueue = `${queue}.retry`;

  await ch.assertExchange(dlxExchange, 'direct', { durable: true });

  await ch.assertQueue(queue, {
    durable: true,
    deadLetterExchange: dlxExchange,
    deadLetterRoutingKey: queue,
  });

  await ch.assertQueue(dlq, { durable: true });
  await ch.bindQueue(dlq, dlxExchange, `${queue}.dlq`);

  await ch.assertQueue(retryQueue, {
    durable: true,
    deadLetterExchange: '',
    deadLetterRoutingKey: queue,
    messageTtl: config.rabbitmq.retryDelayMs,
  });
  await ch.bindQueue(retryQueue, dlxExchange, queue);
}

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel;

  connection = await amqp.connect(config.rabbitmq.url);
  channel = await connection.createChannel();

  await setupQueueWithDlq(config.rabbitmq.transcodingQueue);
  await setupQueueWithDlq(config.rabbitmq.hlsQueue);
  await setupQueueWithDlq(config.rabbitmq.notificationQueue);

  connection.on('close', () => {
    channel = null;
    connection = null;
  });

  return channel;
}

export async function publishMessage<T>(queue: string, message: T): Promise<void> {
  const ch = await connectRabbitMQ();
  ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
    headers: { 'x-retry-count': 0 },
  });
}

export async function consumeMessages<T>(
  queue: string,
  handler: (message: T) => Promise<void>
): Promise<void> {
  const ch = await connectRabbitMQ();
  const maxRetries = config.rabbitmq.maxRetries;
  ch.prefetch(1);

  await ch.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as T;
      await handler(content);
      ch.ack(msg);
    } catch (error) {
      const retryCount = (msg.properties.headers?.['x-retry-count'] as number) || 0;
      const nextRetry = retryCount + 1;

      if (nextRetry <= maxRetries) {
        ch.publish(dlxExchange, queue, msg.content, {
          persistent: true,
          headers: { ...msg.properties.headers, 'x-retry-count': nextRetry },
        });
        ch.ack(msg);
        console.error(`Message failed (retry ${retryCount}/${maxRetries}), scheduled retry:`, error);
      } else {
        ch.publish(dlxExchange, `${queue}.dlq`, msg.content, {
          persistent: true,
          headers: { ...msg.properties.headers, 'x-retry-count': retryCount },
        });
        ch.ack(msg);
        console.error(`Message failed after ${maxRetries} retries, sent to DLQ:`, error);
      }
    }
  });
}

export { config as rabbitConfig };

export async function closeRabbitMQ(): Promise<void> {
  try {
    await channel?.close();
    await connection?.close();
  } finally {
    channel = null;
    connection = null;
  }
}
