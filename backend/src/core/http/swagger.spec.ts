import { buildSwaggerConfig } from './swagger';

describe('Swagger config (US-05)', () => {
  it('expose un titre, une description et une version', () => {
    const doc = buildSwaggerConfig();
    expect(doc.info.title).toMatch(/Savely/i);
    expect(doc.info.description).toBeTruthy();
    expect(doc.info.version).toBeTruthy();
  });

  it('déclare le schéma de sécurité bearer JWT', () => {
    const doc = buildSwaggerConfig();
    expect(doc.components?.securitySchemes).toMatchObject({
      'access-token': expect.objectContaining({
        type: 'http',
        scheme: 'bearer',
      }),
    });
  });
});
