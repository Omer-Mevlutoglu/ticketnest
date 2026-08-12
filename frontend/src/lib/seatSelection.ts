export const calculateSeatTotal = (
  seats: Iterable<{ price: number }>
): number => {
  let total = 0;
  for (const seat of seats) total += seat.price;
  return total;
};
