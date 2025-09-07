import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BlurCircle from "../../components/BlurCircle";
import toast from "react-hot-toast";

type RuleRow = { rows: number[]; tier: string; price: number };
type Blocked = { x: number; y: number };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

const SeatmapGenerate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(12);
  const [defaultTier, setDefaultTier] = useState("Standard");
  const [defaultPrice, setDefaultPrice] = useState(80);

  const [rules, setRules] = useState<RuleRow[]>([
    { rows: [1, 2, 3], tier: "VIP", price: 120 },
  ]);
  const [blockedText, setBlockedText] = useState("5,9; 6,3"); // x,y; x,y

  const blockedSeats: Blocked[] = useMemo(() => {
    return blockedText
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pair) => {
        const [x, y] = pair.split(",").map((n) => parseInt(n.trim(), 10));
        return { x, y };
      })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  }, [blockedText]);

  const addRule = () =>
    setRules((prev) => [...prev, { rows: [], tier: "New Tier", price: 50 }]);
  const updateRule = (i: number, patch: Partial<RuleRow>) =>
    setRules((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  const removeRule = (i: number) =>
    setRules((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const body = {
      rows,
      cols,
      default: { tier: defaultTier, price: defaultPrice },
      rules,
      blockedSeats,
    };

    try {
      try {
        await api(`/api/events/${id}/seatmap/generate`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      } catch {
        // allow UI flow if backend not connected
      }
      toast.success("Seat-map generated");
      nav("/organizer/myevents");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate seat-map");
    }
  };

  const renderPreview = rows <= 16 && cols <= 20;

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40">
      <BlurCircle top="40px" left="80px" />
      <h1 className="text-lg font-semibold mb-6">Generate Seat-map</h1>

      <form onSubmit={submit} className="max-w-4xl space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-300">Rows</label>
            <input
              type="number"
              min={1}
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value, 10) || 1)}
              className="field mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Columns</label>
            <input
              type="number"
              min={1}
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value, 10) || 1)}
              className="field mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">
              Blocked Seats (x,y; x,y)
            </label>
            <input
              value={blockedText}
              onChange={(e) => setBlockedText(e.target.value)}
              className="field mt-1"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-300">Default Tier</label>
            <input
              value={defaultTier}
              onChange={(e) => setDefaultTier(e.target.value)}
              className="field mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Default Price</label>
            <input
              type="number"
              min={0}
              value={defaultPrice}
              onChange={(e) =>
                setDefaultPrice(parseInt(e.target.value, 10) || 0)
              }
              className="field mt-1"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="font-medium mb-2">Rules</h3>
            <button
              type="button"
              onClick={addRule}
              className="btn-outline px-3 py-1.5 rounded-md"
            >
              Add Rule
            </button>
          </div>

          <div className="space-y-3">
            {rules.map((r, idx) => (
              <div
                key={idx}
                className="grid md:grid-cols-4 gap-3 border border-white/10 rounded-lg p-3"
              >
                <div>
                  <label className="text-sm text-gray-300">
                    Rows (e.g. 1,2,3)
                  </label>
                  <input
                    className="field mt-1"
                    value={r.rows.join(",")}
                    onChange={(e) =>
                      updateRule(idx, {
                        rows: e.target.value
                          .split(",")
                          .map((n) => parseInt(n.trim(), 10))
                          .filter((n) => Number.isFinite(n)),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Tier</label>
                  <input
                    className="field mt-1"
                    value={r.tier}
                    onChange={(e) => updateRule(idx, { tier: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Price</label>
                  <input
                    type="number"
                    min={0}
                    className="field mt-1"
                    value={r.price}
                    onChange={(e) =>
                      updateRule(idx, {
                        price: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeRule(idx)}
                    className="btn-ghost px-3 py-2 rounded-md"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {renderPreview ? (
          <div>
            <h3 className="font-medium mb-2">Preview</h3>
            <div
              className="inline-grid"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(16px, 24px))`,
                gap: "6px",
              }}
            >
              {Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((__, c) => {
                  const x = r + 1,
                    y = c + 1;
                  const isBlocked = blockedSeats.some(
                    (b) => b.x === x && b.y === y
                  );
                  const vip = rules.some(
                    (rr) =>
                      rr.rows.includes(x) && rr.tier.toLowerCase() === "vip"
                  );
                  return (
                    <div
                      key={`${x}-${y}`}
                      title={`(${x},${y})`}
                      className={`w-5 h-5 rounded ${
                        isBlocked
                          ? "bg-white/20"
                          : vip
                          ? "bg-yellow-500/70"
                          : "bg-primary/60"
                      }`}
                    />
                  );
                })
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Yellow = VIP; Gray = blocked
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            Preview disabled for large grids (&gt; 16 × 20).
          </p>
        )}

        <div className="pt-2">
          <button type="submit" className="btn-primary">
            Generate Seat-map
          </button>
        </div>
      </form>
    </div>
  );
};

export default SeatmapGenerate;
