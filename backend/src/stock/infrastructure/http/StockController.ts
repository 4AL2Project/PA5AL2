/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Adapter In — HTTP controller pour l'import de stock (DDD)
 *
 * Responsabilité unique : traduire HTTP → Command → Port In.
 * Aucune logique métier ici.
 */
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ImporterStockUseCase,
  ImporterStockCommand,
  IMPORTER_STOCK_USE_CASE,
} from '../../application/ports/ImporterStockUseCase';
import { PharmacyId } from '../../domain/model/PharmacyId';

@Controller('stock')
export class StockController {
  constructor(
    @Inject(IMPORTER_STOCK_USE_CASE)
    private readonly useCase: ImporterStockUseCase,
  ) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importerStock(
    @UploadedFile() file: Express.Multer.File,
    @Body('pharmacyId') pharmacyIdRaw: string,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier manquant (champ : file)');
    }
    if (!pharmacyIdRaw) {
      throw new BadRequestException('pharmacyId manquant dans le body');
    }

    let pharmacyId: PharmacyId;
    try {
      pharmacyId = PharmacyId.create(pharmacyIdRaw);
    } catch {
      throw new BadRequestException('pharmacyId invalide');
    }

    const command = new ImporterStockCommand(
      pharmacyId,
      file.buffer,
      file.originalname,
    );

    const result = await this.useCase.execute(command);

    return {
      importes: result.nbImportes,
      erreurs: result.nbErreurs,
      critiques: result.produitsCritiques,
    };
  }
}
