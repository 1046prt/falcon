import { config } from '../src/config';

describe('shared config', () => {
  test('resolutions contains common values', () => {
    expect(config.resolutions).toContain('1080p');
    expect(config.resolutions).toContain('720p');
  });

  test('s3 config has endpoint key', () => {
    expect(config.s3).toHaveProperty('endpoint');
  });
});
