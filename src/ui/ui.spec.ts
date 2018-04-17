import { _parseNotificationParams as pnp } from './ui';
import { stringify } from '../util/stringify';

describe('_parseNotificationParams', () => {
  it('returns null if given nothing', () => {
    expect(pnp(null)).toBeNull();
    expect(pnp(undefined)).toBeNull();
  });

  it('parses strings', () => {
    const messageText = 'Open the pod bay doors, HAL';

    let result = pnp([messageText]);
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

  it('parses any', () => {
    // Objects
    const obj = { hello: 'world' };
    let result = pnp([obj]);
    expect(result.message).toBe(stringify(obj));
    expect(result.type).toBe('default');

    // Numbers
    result = pnp([5]);
    expect(result.message).toBe((5).toString());
    expect(result.type).toBe('default');

    // With Title
    const title = 'Untitled';
    result = pnp([5, title]);
    expect(result.message).toBe((5).toString());
    expect(result.title).toBe(title);

    // With Type
    const type = 'success';
    result = pnp([5, title, type]);
    expect(result.message).toBe((5).toString());
    expect(result.title).toBe(title);
    expect(result.type).toBe(type);
  });
});
