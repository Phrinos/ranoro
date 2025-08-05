
import React from 'react';
import { PayableAccount } from '@/types';

interface CuentasPorPagarContentProps {
  accounts: PayableAccount[];
}

export const CuentasPorPagarContent: React.FC<CuentasPorPagarContentProps> = ({ accounts }) => {
  return (
    <div>
      {/* Add your content for Cuentas por Pagar here */}
    </div>
  );
};
