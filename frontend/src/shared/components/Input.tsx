import type { InputHTMLAttributes } from 'react';

type InputProps = { label?: string } & InputHTMLAttributes<HTMLInputElement>;

function Input({ label, id, className, ...rest }: InputProps) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} className={`input ${className ?? ''}`.trim()} {...rest} />
    </div>
  );
}

export default Input;
