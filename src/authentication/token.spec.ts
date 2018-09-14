import { TokenStorage, IToken } from './token.manager';

describe('The TokenStorage class', () => {
  it('can be instantiated', () => {
    // Setup
    const tokenStorage = new TokenStorage();

    // Assert
    expect(tokenStorage).toBeDefined();
  });

  it('can get a token that has not expired', () => {
    // Setup
    const tokenStorage = new TokenStorage();
    const mockToken: IToken = {
      provider: 'mockProvider',
      expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000)
    };
    const mockTokenName = 'mockTokenName';

    // Act
    tokenStorage.set(mockTokenName, mockToken);

    // Assert
    expect(tokenStorage.get(mockTokenName)).toEqual(mockToken);
  });

  it('can get a token that has expired', () => {
    // Setup
    const tokenStorage = new TokenStorage();
    const mockToken: IToken = {
      provider: 'mockProvider',
      expires_at: new Date(Date.now() - 3 * 60 * 60 * 1000)
    };
    const mockTokenName = 'mockTokenName';

    // Act
    tokenStorage.set(mockTokenName, mockToken);

    // Assert
    expect(tokenStorage.get(mockTokenName)).toEqual(mockToken);
  });
});
