import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isCuit', async: false })
export class IsCuitConstraint implements ValidatorConstraintInterface {
  validate(cuit: any, args: ValidationArguments) {
    if (typeof cuit !== 'string') return false;
    
    // Formato XX-XXXXXXXX-X
    const regex = /^\d{2}-\d{8}-\d{1}$/;
    if (!regex.test(cuit)) return false;

    const digits = cuit.replace(/-/g, '').split('').map(Number);
    if (digits.length !== 11) return false;

    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * multipliers[i];
    }

    let dv = 11 - (sum % 11);
    if (dv === 11) dv = 0;
    if (dv === 10) dv = 9;

    return dv === digits[10];
  }

  defaultMessage(args: ValidationArguments) {
    return 'CUIT inválido (formato XX-XXXXXXXX-X o dígito verificador erróneo)';
  }
}

export function IsCuit(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCuitConstraint,
    });
  };
}
