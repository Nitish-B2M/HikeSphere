import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Sidebar({ title, children, footer, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'w-80 h-full flex flex-col bg-white border-r border-gray-200 shadow-sm',
        className
      )}
    >
      <header className="flex items-center gap-2 px-4 h-14 border-b border-gray-200">
        <Link
          to="/dashboard"
          className="h-9 w-9 inline-flex items-center justify-center rounded hover:bg-gray-100"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-semibold text-sm truncate flex-1">{title}</h1>
      </header>
      <div className="flex-1 overflow-auto scrollbar-thin">{children}</div>
      {footer}
    </aside>
  );
}
