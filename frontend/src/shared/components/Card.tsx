import type { HTMLAttributes } from 'react';

function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className ?? ''}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export default Card;
