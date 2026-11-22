import React from 'react';
import { useField } from 'formik';
import Input, { InputProps } from './Input';

export default function FormikInput({ name, ...props }: { name: string } & InputProps) {
    const [field, meta] = useField(name);

    return <Input {...field} {...props} error={meta.touched ? meta.error : undefined} />;
}

export { FormikInput };
