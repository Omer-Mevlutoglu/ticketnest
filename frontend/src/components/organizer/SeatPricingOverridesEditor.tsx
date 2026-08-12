import { PlusIcon, Trash2Icon } from "lucide-react";
import { validateSeatPricingOverrides } from "@/lib/seatMapSpec";
import { tierStyle } from "@/lib/seatTiers";
import type { SeatPricingOverride } from "@/types/seatMap";

interface Props {
  rows: number;
  cols: number;
  defaultPrice: number;
  value: SeatPricingOverride[];
  onChange: (value: SeatPricingOverride[]) => void;
  disabled?: boolean;
}

const SeatPricingOverridesEditor = ({
  rows,
  cols,
  defaultPrice,
  value,
  onChange,
  disabled = false,
}: Props) => {
  const error = validateSeatPricingOverrides(value, rows, cols);

  const addOverride = () => {
    const used = new Set(value.map((seat) => `${seat.x},${seat.y}`));
    let coordinate = { x: 1, y: 1 };

    outer: for (let x = 1; x <= rows; x += 1) {
      for (let y = 1; y <= cols; y += 1) {
        if (!used.has(`${x},${y}`)) {
          coordinate = { x, y };
          break outer;
        }
      }
    }

    onChange([
      ...value,
      {
        ...coordinate,
        tier: "Premium",
        price: Math.round(defaultPrice * 1.5 * 100) / 100,
      },
    ]);
  };

  const updateOverride = (
    index: number,
    patch: Partial<SeatPricingOverride>
  ) =>
    onChange(
      value.map((override, current) =>
        current === index ? { ...override, ...patch } : override
      )
    );

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-black/10 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Individual seat pricing</p>
          <p className="mt-1 text-xs text-gray-400">
            Assign a different tier and price to exact row/seat coordinates.
          </p>
        </div>
        <button
          type="button"
          onClick={addOverride}
          disabled={disabled || value.length >= rows * cols}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add priced seat
        </button>
      </div>

      {value.length === 0 ? (
        <p className="mt-3 text-xs text-gray-500">
          All seats currently use the default tier and price.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {value.map((override, index) => {
            const colors = tierStyle(override.tier);
            return (
              <div
                key={index}
                className="grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-white/5 p-2 sm:grid-cols-[70px_70px_minmax(120px,1fr)_110px_36px]"
              >
                <label className="text-[11px] text-gray-400">
                  Row
                  <input
                    type="number"
                    min={1}
                    max={rows}
                    value={override.x}
                    disabled={disabled}
                    onChange={(event) =>
                      updateOverride(index, { x: Number(event.target.value) })
                    }
                    className="mt-1 w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-white"
                  />
                </label>
                <label className="text-[11px] text-gray-400">
                  Seat
                  <input
                    type="number"
                    min={1}
                    max={cols}
                    value={override.y}
                    disabled={disabled}
                    onChange={(event) =>
                      updateOverride(index, { y: Number(event.target.value) })
                    }
                    className="mt-1 w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-white"
                  />
                </label>
                <label className="text-[11px] text-gray-400">
                  Tier
                  <span className="relative mt-1 flex items-center">
                    <span
                      className={`absolute left-2 h-2.5 w-2.5 rounded-full border ${colors.dot}`}
                    />
                    <input
                      value={override.tier}
                      disabled={disabled}
                      onChange={(event) =>
                        updateOverride(index, { tier: event.target.value })
                      }
                      className="w-full rounded border border-white/10 bg-black/20 py-1.5 pl-7 pr-2 text-sm text-white"
                    />
                  </span>
                </label>
                <label className="text-[11px] text-gray-400">
                  Price
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={override.price}
                    disabled={disabled}
                    onChange={(event) =>
                      updateOverride(index, {
                        price: Number(event.target.value),
                      })
                    }
                    className="mt-1 w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-white"
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Remove pricing override for row ${override.x}, seat ${override.y}`}
                  title="Remove override"
                  disabled={disabled}
                  onClick={() =>
                    onChange(value.filter((_, current) => current !== index))
                  }
                  className="self-end rounded border border-rose-400/20 p-1.5 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <Trash2Icon className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
};

export default SeatPricingOverridesEditor;
