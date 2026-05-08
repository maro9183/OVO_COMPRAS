import { PartialType } from '@nestjs/mapped-types';
import { CreateProveedorDto } from './create-proveedor.dto';

// Note: CreateProveedorDto is used, but the import from mapped-types handles partial
export class UpdateProveedorDto extends PartialType(CreateProveedorDto) {}
