import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

function Card({ children, className = '', padding = 'md', hover = false, ...props }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`
        bg-white border border-zinc-200 rounded-xl shadow-sm
        ${hover ? 'transition-shadow duration-200 hover:shadow-md cursor-pointer' : ''}
        ${paddings[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`pb-4 border-b border-zinc-100 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-zinc-900 ${className}`}>{children}</h3>;
}

function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-zinc-500 mt-1 ${className}`}>{children}</p>;
}

function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`pt-4 ${className}`}>{children}</div>;
}

function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`pt-4 border-t border-zinc-100 mt-4 ${className}`}>{children}</div>;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
