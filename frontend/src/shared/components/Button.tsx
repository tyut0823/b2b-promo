import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = { variant?: 'primary' | 'secondary' | 'danger' } & ButtonHTMLAttributes<HTMLButtonElement>;

function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  return <button className={`btn btn-${variant} ${className ?? ''}`.trim()} {...rest} />;
}

export default Button;
