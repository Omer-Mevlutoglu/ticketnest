export interface GridSeatMapSpec {
  rows: number;
  cols: number;
  default: {
    tier: string;
    price: number;
  };
  rules?: Array<{
    rows: number[];
    tier: string;
    price: number;
  }>;
  blockedSeats?: Array<{
    x: number;
    y: number;
  }>;
}
