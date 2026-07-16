// Roger — v1.0
// Tests unitaires EmailService — US-67 migration Resend

const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

import { InternalServerErrorException } from '@nestjs/common';

import { config } from '../../core/config';
import { EmailService } from './email.service';

describe('EmailService — sendInvitationEmail (US-67)', () => {
  let service: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    service = new EmailService();
  });

  it('envoie avec le bon sujet et destinataire', async () => {
    await service.sendInvitationEmail(
      'test@pharma.fr',
      'https://savely.fr/invite/abc'
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@pharma.fr',
        subject: 'Bienvenue sur Savely — Finalisez votre compte',
      })
    );
  });

  it('inclut le lien dans le corps HTML', async () => {
    const link = 'https://savely.fr/invite/abc123';
    await service.sendInvitationEmail('test@pharma.fr', link);

    const call = mockSend.mock.calls[0][0] as { html: string };
    expect(call.html).toContain(link);
  });

  it("utilise l'adresse from configuree", async () => {
    await service.sendInvitationEmail(
      'test@pharma.fr',
      'https://savely.fr/invite/abc'
    );

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.any(String) })
    );
  });

  it('se resout sans erreur quand Resend repond OK', async () => {
    await expect(
      service.sendInvitationEmail(
        'test@pharma.fr',
        'https://savely.fr/invite/abc'
      )
    ).resolves.toBeUndefined();
  });

  it('leve InternalServerErrorException si Resend retourne une erreur', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: 'Domain not verified', name: 'validation_error' },
    });

    await expect(
      service.sendInvitationEmail(
        'test@pharma.fr',
        'https://savely.fr/invite/abc'
      )
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('propage une erreur reseau si Resend echoue', async () => {
    mockSend.mockRejectedValue(new Error('Resend API error'));

    await expect(
      service.sendInvitationEmail(
        'test@pharma.fr',
        'https://savely.fr/invite/abc'
      )
    ).rejects.toThrow('Resend API error');
  });
});

describe('EmailService — sendMagicLinkEmail (US-67)', () => {
  let service: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    service = new EmailService();
  });

  it('envoie un magic link avec le bon sujet et destinataire', async () => {
    await service.sendMagicLinkEmail(
      'test@pharma.fr',
      'https://savely.fr/auth/verify?token=xyz'
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@pharma.fr',
        subject: 'Savely — Votre lien de connexion',
      })
    );
  });

  it('inclut le lien de connexion dans le corps HTML', async () => {
    const link = 'https://savely.fr/auth/verify?token=xyz789';
    await service.sendMagicLinkEmail('test@pharma.fr', link);

    const call = mockSend.mock.calls[0][0] as { html: string };
    expect(call.html).toContain(link);
  });

  it("utilise l'adresse from configuree", async () => {
    await service.sendMagicLinkEmail(
      'test@pharma.fr',
      'https://savely.fr/auth/verify?token=xyz'
    );

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.any(String) })
    );
  });

  it('se resout sans erreur quand Resend repond OK', async () => {
    await expect(
      service.sendMagicLinkEmail(
        'test@pharma.fr',
        'https://savely.fr/auth/verify?token=xyz'
      )
    ).resolves.toBeUndefined();
  });

  it('leve InternalServerErrorException si Resend retourne une erreur', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: 'Domain not verified', name: 'validation_error' },
    });

    await expect(
      service.sendMagicLinkEmail(
        'test@pharma.fr',
        'https://savely.fr/auth/verify?token=xyz'
      )
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('propage une erreur reseau si Resend echoue', async () => {
    mockSend.mockRejectedValue(new Error('Resend network error'));

    await expect(
      service.sendMagicLinkEmail(
        'test@pharma.fr',
        'https://savely.fr/auth/verify?token=xyz'
      )
    ).rejects.toThrow('Resend network error');
  });
});

describe('EmailService — sendInvitationEmail (US-67)', () => {
  let service: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    service = new EmailService();
  });

  it('envoie avec le bon sujet et destinataire', async () => {
    await service.sendInvitationEmail(
      'test@pharma.fr',
      'https://savely.fr/invite/abc'
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@pharma.fr',
        subject: 'Bienvenue sur Savely — Finalisez votre compte',
      })
    );
  });

  it('inclut le lien dans le corps HTML', async () => {
    const link = 'https://savely.fr/invite/abc123';
    await service.sendInvitationEmail('test@pharma.fr', link);

    const call = mockSend.mock.calls[0][0] as { html: string };
    expect(call.html).toContain(link);
  });

  it("utilise l'adresse from configuree", async () => {
    await service.sendInvitationEmail(
      'test@pharma.fr',
      'https://savely.fr/invite/abc'
    );

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.stringContaining('savely.fr') })
    );
  });

  it('se resout sans erreur quand Resend repond OK', async () => {
    await expect(
      service.sendInvitationEmail(
        'test@pharma.fr',
        'https://savely.fr/invite/abc'
      )
    ).resolves.toBeUndefined();
  });

  it('propage une erreur si Resend echoue', async () => {
    mockSend.mockRejectedValue(new Error('Resend API error'));

    await expect(
      service.sendInvitationEmail(
        'test@pharma.fr',
        'https://savely.fr/invite/abc'
      )
    ).rejects.toThrow('Resend API error');
  });
});

describe('EmailService — sendMagicLinkEmail (US-67)', () => {
  let service: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    service = new EmailService();
  });

  it('envoie un magic link avec le bon sujet et destinataire', async () => {
    await service.sendMagicLinkEmail(
      'test@pharma.fr',
      'https://savely.fr/auth/verify?token=xyz'
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@pharma.fr',
        subject: 'Savely — Votre lien de connexion',
      })
    );
  });

  it('inclut le lien de connexion dans le corps HTML', async () => {
    const link = 'https://savely.fr/auth/verify?token=xyz789';
    await service.sendMagicLinkEmail('test@pharma.fr', link);

    const call = mockSend.mock.calls[0][0] as { html: string };
    expect(call.html).toContain(link);
  });

  it("utilise l'adresse from configuree", async () => {
    await service.sendMagicLinkEmail(
      'test@pharma.fr',
      'https://savely.fr/auth/verify?token=xyz'
    );

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.stringContaining('savely.fr') })
    );
  });

  it('se resout sans erreur quand Resend repond OK', async () => {
    await expect(
      service.sendMagicLinkEmail(
        'test@pharma.fr',
        'https://savely.fr/auth/verify?token=xyz'
      )
    ).resolves.toBeUndefined();
  });

  it('propage une erreur si Resend echoue', async () => {
    mockSend.mockRejectedValue(new Error('Resend network error'));

    await expect(
      service.sendMagicLinkEmail(
        'test@pharma.fr',
        'https://savely.fr/auth/verify?token=xyz'
      )
    ).rejects.toThrow('Resend network error');
  });
});

describe('EmailService — transport SMTP (MailHog)', () => {
  let service: EmailService;
  const originalTransport = config.email.transport;

  beforeEach(() => {
    jest.clearAllMocks();
    config.email.transport = 'smtp';
    mockSendMail.mockResolvedValue({ messageId: 'smtp-msg-id' });
    service = new EmailService();
  });

  afterEach(() => {
    config.email.transport = originalTransport;
  });

  it('envoie via SMTP sans passer par Resend', async () => {
    await service.sendInvitationEmail(
      'test@pharma.fr',
      'https://savely.fr/invite/abc'
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@pharma.fr',
        subject: 'Bienvenue sur Savely — Finalisez votre compte',
      })
    );
  });

  it('leve InternalServerErrorException si SMTP echoue', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP down'));

    await expect(
      service.sendMagicLinkEmail(
        'test@pharma.fr',
        'https://savely.fr/auth/verify?token=xyz'
      )
    ).rejects.toThrow(InternalServerErrorException);
  });
});
