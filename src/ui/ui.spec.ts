import { _parseNotificationParams as pnp } from './ui';

describe('_parseNotificationParams', () => {
  it('returns null if given nothing', () => {
    expect(pnp(null)).toBeNull();
    expect(pnp(undefined)).toBeNull();
  });

  it('parses strings', () => {
    const messageText = 'Open the pod bay doors, HAL';

    let result = pnp([messageText]);
    console.log(result);
    expect(result.message).toBe(messageText);
    expect(result.type).toBe('default');

    result = pnp([new String(messageText)]);
    expect(result.message).toBe(messageText);
  });

  it('parses errors', () => {
    const errorText = `I'm sorry, Dave. I'm afraid I can't do that.`
    const error = new Error(errorText);

    const result = pnp([error]);
    expect(result.message).toBe(errorText);
    expect(result.type).toBe('error');
  });
});
