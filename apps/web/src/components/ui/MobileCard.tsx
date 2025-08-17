import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface MobileCardProps {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  actions?: ReactNode;
  className?: string;
}

export default function MobileCard({ 
  title, 
  children, 
  collapsible = false, 
  defaultOpen = true,
  actions,
  className = ''
}: MobileCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={`bg-[#2e231d] border-[#4b3527] ${className}`}>
      <CardHeader 
        className={`p-3 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {actions}
            {collapsible && (
              <div className="text-[#c7b38a]">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      {(!collapsible || isOpen) && (
        <CardContent className="p-3 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}