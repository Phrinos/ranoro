import type { PaymentMethod } from "./index";

export type Payment = {
  id: string;
  date: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  note?: string;
};

export type Infraction = {
  id: string;
  date: string;
  amount: number;
  description: string;
};
