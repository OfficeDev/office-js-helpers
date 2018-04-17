export function stringify(value: any): string {
  // JSON.stringify of undefined will return undefined rather than 'undefined'
  if (value === undefined) {
    return 'undefined';
  }

  // Don't JSON.stringify strings, we don't want quotes in the output
  if (typeof value === 'string') {
    return value;
  }

  // Use toString() only if it's useful
  if (typeof value.toString === 'function' && value.toString() !== '[object Object]') {
    return value.toString();
  }

  // Otherwise, JSON stringify the object
  return JSON.stringify(value, null, 2);
}
