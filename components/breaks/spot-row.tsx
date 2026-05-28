"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { TeamBadge } from "@/components/breaks/team-badge";
import { CustomerPicker } from "@/components/breaks/customer-picker";
import { updateSpot, unassignSpot } from "@/lib/actions/spots";
import { formatCurrency, cn } from "@/lib/utils";

type Team = {
  id: string;
  name: string;
  abbreviation: string | null;
  primary_color: string | null;
  text_color: string | null;
};

type Spot = {
  id: string;
  spot_number: number;
  customer_id: string | null;
  customer_name: string | null;
  price: number | null;
  shipping_cost: number;
  supplies_cost: number;
  fees_cost: number;
  payment_received: boolean;
  shipped: boolean;
  tracking_number: string | null;
  notes: string | null;
  teams: Team[];
};

type Props = {
  spot: Spot;
  breakId: string;
};

export function SpotRow({ spot, breakId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Local copies for editing
  const [customerId, setCustomerId] = useState<string | null>(spot.customer_id);
  const [customerName, setCustomerName] = useState<string | null>(spot.customer_name);
  const [price, setPrice] = useState<string>(spot.price?.toString() || "");
  const [shippingCost, setShippingCost] = useState<string>(
    spot.shipping_cost > 0 ? spot.shipping_cost.toString() : ""
  );
  const [suppliesCost, setSuppliesCost] = useState<string>(
    spot.supplies_cost > 0 ? spot.supplies_cost.toString() : ""
  );
  const [feesCost, setFeesCost] = useState<string>(
    spot.fees_cost > 0 ? spot.fees_cost.toString() : ""
  );
  const [paymentReceived, setPaymentReceived] = useState(spot.payment_received);
  const [shipped, setShipped] = useState(spot.shipped);
  const [trackingNumber, setTrackingNumber] = useState(spot.tracking_number || "");
  const [notes, setNotes] = useState(spot.notes || "");

  function handleCustomerSelect(id: string | null, name: string | null) {
    setCustomerId(id);
    setCustomerName(name);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateSpot(spot.id, breakId, {
        customer_id: customerId,
        price: price.trim() ? Number(price) : null,
        shipping_cost: shippingCost.trim() ? Number(shippingCost) : 0,
        supplies_cost: suppliesCost.trim() ? Number(suppliesCost) : 0,
        fees_cost: feesCost.trim() ? Number(feesCost) : 0,
        payment_received: paymentReceived,
        shipped,
        tracking_number: trackingNumber.trim() || null,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        setError(result.message || "Failed to save");
      } else {
        setExpanded(false);
      }
    });
  }

  function clearSpot() {
    setError(null);
    startTransition(async () => {
      const result = await unassignSpot(spot.id, breakId);
      if (!result.ok) {
        setError(result.message || "Failed to clear");
      } else {
        // Reset local state
        setCustomerId(null);
        setCustomerName(null);
        setPrice("");
        setShippingCost("");
        setSuppliesCost("");
        setFeesCost("");
        setPaymentReceived(false);
        setShipped(false);
        setTrackingNumber("");
        setExpanded(false);
      }
    });
  }

  const isSold = !!spot.customer_id;

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        expanded ? "border-navy-300 bg-white" : "border-cream-200 bg-white hover:bg-cream-50"
      )}
    >
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 flex items-center gap-3"
      >
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-navy-900 text-cream-50 text-xs font-medium flex-shrink-0">
          {spot.spot_number}
        </span>
        <div className="flex-1 min-w-0">
          {spot.teams.length === 0 ? (
            <p className="text-sm text-ink-subtle italic">No teams</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {spot.teams.map((t) => (
                <TeamBadge key={t.id} team={t} variant="abbr" />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isSold ? (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-navy-900">
                  {spot.customer_name || "—"}
                </p>
                <p className="text-xs text-ink-muted tabular-nums">
                  {formatCurrency(spot.price)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {spot.payment_received && (
                  <CheckCircle2 className="h-4 w-4 text-green-700" aria-label="Paid" />
                )}
                {spot.shipped && (
                  <Truck className="h-4 w-4 text-navy-700" aria-label="Shipped" />
                )}
              </div>
            </>
          ) : (
            <span className="text-xs text-ink-subtle italic">Unsold</span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-ink-subtle" />
          ) : (
            <ChevronDown className="h-4 w-4 text-ink-subtle" />
          )}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-cream-200 p-4 space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="space-y-1.5">
            <Label>Customer</Label>
            <CustomerPicker
              selectedCustomerId={customerId}
              onSelect={handleCustomerSelect}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`price-${spot.id}`}>Sale price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm">$</span>
                <Input
                  id={`price-${spot.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                  disabled={!customerId}
                />
              </div>
            </div>
          </div>

          {isSold && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`shipping-${spot.id}`} className="text-xs">
                    Shipping
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm">$</span>
                    <Input
                      id={`shipping-${spot.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(e.target.value)}
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`supplies-${spot.id}`} className="text-xs">
                    Supplies
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm">$</span>
                    <Input
                      id={`supplies-${spot.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={suppliesCost}
                      onChange={(e) => setSuppliesCost(e.target.value)}
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`fees-${spot.id}`} className="text-xs">
                    Platform fees
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm">$</span>
                    <Input
                      id={`fees-${spot.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={feesCost}
                      onChange={(e) => setFeesCost(e.target.value)}
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentReceived}
                    onChange={(e) => setPaymentReceived(e.target.checked)}
                    className="rounded border-cream-300 text-navy-700 focus:ring-navy-400"
                  />
                  <span className="text-sm text-navy-900">Payment received</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shipped}
                    onChange={(e) => setShipped(e.target.checked)}
                    className="rounded border-cream-300 text-navy-700 focus:ring-navy-400"
                  />
                  <span className="text-sm text-navy-900">Shipped</span>
                </label>
              </div>

              {shipped && (
                <div className="space-y-1.5">
                  <Label htmlFor={`tracking-${spot.id}`}>Tracking number</Label>
                  <Input
                    id={`tracking-${spot.id}`}
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="9400 1234 5678..."
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor={`notes-${spot.id}`}>Notes</Label>
                <Textarea
                  id={`notes-${spot.id}`}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button type="button" onClick={save} loading={pending}>
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setExpanded(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            {isSold && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearSpot}
                disabled={pending}
                className="ml-auto text-red-700 hover:text-red-800"
              >
                <X className="h-4 w-4" />
                Clear spot
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
