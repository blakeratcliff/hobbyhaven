"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

export type ProductInput = {
  product_name: string;
  product_year: string;
  box_cost: string;
  box_count: string;
};

const emptyProduct: ProductInput = {
  product_name: "",
  product_year: "",
  box_cost: "",
  box_count: "1",
};

export function ProductsFieldArray({
  initialProducts,
}: {
  initialProducts?: ProductInput[];
}) {
  const [products, setProducts] = useState<ProductInput[]>(
    initialProducts && initialProducts.length > 0
      ? initialProducts
      : [{ ...emptyProduct }]
  );

  function addProduct() {
    setProducts([...products, { ...emptyProduct }]);
  }

  function removeProduct(idx: number) {
    setProducts(products.filter((_, i) => i !== idx));
  }

  function update(idx: number, field: keyof ProductInput, value: string) {
    const next = [...products];
    next[idx] = { ...next[idx], [field]: value };
    setProducts(next);
  }

  // Running total
  const total = products.reduce((sum, p) => {
    const cost = parseFloat(p.box_cost) || 0;
    const count = parseInt(p.box_count) || 1;
    return sum + cost * count;
  }, 0);

  return (
    <div className="space-y-4">
      <input type="hidden" name="product_count" value={products.length} />

      {products.map((p, idx) => (
        <div
          key={idx}
          className="border border-cream-200 rounded-lg p-4 space-y-3 relative"
        >
          {products.length > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
                Product {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeProduct(idx)}
                className="text-ink-subtle hover:text-red-600 transition-colors"
                aria-label={`Remove product ${idx + 1}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`product_${idx}_name`}>Product name</Label>
              <Input
                id={`product_${idx}_name`}
                name={`product_${idx}_name`}
                required
                value={p.product_name}
                onChange={(e) => update(idx, "product_name", e.target.value)}
                placeholder="2025 Topps Chrome"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`product_${idx}_year`}>Year</Label>
              <Input
                id={`product_${idx}_year`}
                name={`product_${idx}_year`}
                type="number"
                min="1980"
                max="2100"
                value={p.product_year}
                onChange={(e) => update(idx, "product_year", e.target.value)}
                placeholder="2025"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`product_${idx}_box_cost`}>Box cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm">
                  $
                </span>
                <Input
                  id={`product_${idx}_box_cost`}
                  name={`product_${idx}_box_cost`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={p.box_cost}
                  onChange={(e) => update(idx, "box_cost", e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`product_${idx}_box_count`}>Number of boxes</Label>
              <Input
                id={`product_${idx}_box_count`}
                name={`product_${idx}_box_count`}
                type="number"
                min="1"
                value={p.box_count}
                onChange={(e) => update(idx, "box_count", e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addProduct}
        >
          <Plus className="h-4 w-4" />
          Add another product
        </Button>
        {total > 0 && (
          <p className="text-sm text-ink-muted">
            Total product cost:{" "}
            <span className="font-medium text-navy-900 tabular-nums">
              {formatCurrency(total)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
