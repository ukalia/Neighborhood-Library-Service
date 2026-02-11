interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false }: CardProps) {
  const hoverClass = hover ? 'transition-shadow hover:shadow-card-hover' : '';

  return (
    <div className={`bg-white rounded-lg shadow-card p-6 ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}
