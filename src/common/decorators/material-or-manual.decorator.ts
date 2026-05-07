import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function MaterialOrManual(property: string, validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'materialOrManual',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const relatedValue = (args.object as any)[args.constraints[0]];
          
          const matFilled = relatedValue !== undefined && relatedValue !== null;
          const manFilled = value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';

          return (!matFilled && manFilled) || (matFilled && !manFilled);
        },
        defaultMessage: () => 'Debe existir exactamente uno: id_material O descripcion_manual (y no debe estar vacío)',
      },
    });
  };
}
