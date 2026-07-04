import amqp, { Channel } from 'amqplib';
import { config } from './config';

let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel;

  const connection = await amqp.connect(config.rabbitmq.url);
  channel = await connection.createChannel();

  await channel.assertQueue(config.rabbitmq.transcodingQueue, { durable: true });
  await channel.assertQueue(config.rabbitmq.hlsQueue, { durable: true });
  await channel.assertQueue(config.rabbitmq.notificationQueue, { durable: true });

  return channel;
}

export async function publishMessage<T>(queue: string, message: T): Promise<void> {
  const ch = await connectRabbitMQ();
  ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
}

export async function consumeMessages<T>(
  queue: string,
  handler: (message: T) => Promise<void>
): Promise<void> {
  const ch = await connectRabbitMQ();
  ch.prefetch(1);

  await ch.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as T;
      await handler(content);
      ch.ack(msg);
    } catch (error) {
      console.error(`Failed to process message from ${queue}:`, error);
      ch.nack(msg, false, true);
    }
  });
}

export { config as rabbitConfig };
