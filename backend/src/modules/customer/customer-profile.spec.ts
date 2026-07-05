/**
 * Mise à jour du profil Customer — US-86
 * PATCH /api/customers/me : civilité + identité
 */
import { JwtService } from '@nestjs/jwt';

import { EmailService } from '../email/email.service';
import { CustomerService } from './customer.service';
import { UpdateCustomerMeDto } from './dto/customer.dto';

jest.mock('../../database/client', () => ({
  prisma: { customer: { update: jest.fn() } },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: { customer: { update: jest.Mock } };
};

describe('CustomerService — updateProfile', () => {
  let service: CustomerService;

  beforeEach(() => {
    jest.clearAllMocks();
    const jwt = { sign: jest.fn() } as unknown as JwtService;
    const emailSvc = {} as unknown as EmailService;
    service = new CustomerService(jwt, emailSvc);
  });

  it('transmet la civilité et renvoie le profil sans champ adresse', async () => {
    const dto: UpdateCustomerMeDto = {
      civility: 'MME',
      first_name: 'Jeanne',
      last_name: 'Dupont',
    };
    prisma.customer.update.mockResolvedValue({
      customer_id: 'cust-1',
      email: 'jeanne@example.com',
      ...dto,
    });

    const res = await service.updateProfile('cust-1', dto);

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customer_id: 'cust-1' },
        data: dto,
        select: expect.objectContaining({ civility: true }),
      })
    );
    // Le select ne doit exposer aucun champ adresse (RGPD)
    const selectArg = prisma.customer.update.mock.calls[0][0].select;
    expect(selectArg).not.toHaveProperty('address_line');
    expect(selectArg).not.toHaveProperty('city');
    expect(selectArg).not.toHaveProperty('postal_code');
    expect(selectArg).not.toHaveProperty('latitude');
    expect(selectArg).not.toHaveProperty('longitude');
    expect(res.civility).toBe('MME');
  });
});
