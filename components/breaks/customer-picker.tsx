"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, X, UserPlus, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCustomerQuick } from "@/lib/actions/spots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Customer = {
  id: string;
  display_name: string;
};

type Props = {
  selectedCustomerId: string | null;
  onSelect: (customerId: string | null, customerName: string | null) => void;
};

const PLATFORMS = [
  { value: "whatnot", label: "Whatnot" },
  { value: "fanatics_live", label: "Fanatics Live" },
  { value: "discord", label: "Discord" },
  { value: "ebay", label: "eBay" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter / X" },
  { value: "other", label: "Other" },
];

export function CustomerPicker({ selectedCustomerId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick add state
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("whatnot");
  const [newUsername, setNewUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Fetch customers, debounced search
  useEffect(() => {
    let cancelled = false;
    async function fetchCustomers() {
      setLoading(true);
      const supabase = createClient();
      let q = supabase.from("customers").select("id, display_name").order("display_name").limit(20);
      if (query.trim()) {
        q = q.ilike("display_name", `%${query.trim()}%`);
      }
      const { data } = await q;
      if (!cancelled) {
        setCustomers((data as Customer[] | null) || []);
        setLoading(false);
      }
    }
    const handle = setTimeout(fetchCustomers, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  // If we have a selectedCustomerId but no name, look it up
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedName(null);
      return;
    }
    const match = customers.find((c) => c.id === selectedCustomerId);
    if (match) {
      setSelectedName(match.display_name);
    } else {
      // Fall back to a direct lookup
      const supabase = createClient();
      supabase
        .from("customers")
        .select("display_name")
        .eq("id", selectedCustomerId)
        .maybeSingle<{ display_name: string }>()
        .then(({ data }) => {
          if (data) setSelectedName(data.display_name);
        });
    }
  }, [selectedCustomerId, customers]);

  async function handleQuickAdd() {
    if (!newName.trim()) {
      setAddError("Name is required");
      return;
    }
    setAddError(null);
    setAdding(true);
    const result = await createCustomerQuick({
      display_name: newName.trim(),
      platform: newUsername.trim() ? newPlatform : undefined,
      username: newUsername.trim() || undefined,
    });
    setAdding(false);

    if (result.ok) {
      onSelect(result.id, newName.trim());
      setNewName("");
      setNewUsername("");
      setShowAdd(false);
      setQuery("");
    } else {
      setAddError(result.message);
    }
  }

  // ============================================================
  // Render
  // ============================================================
  if (selectedCustomerId && selectedName) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-cream-100 border border-cream-200">
          <Check className="h-4 w-4 text-green-700" />
          <span className="text-sm text-navy-900 font-medium">{selectedName}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onSelect(null, null)}
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!showAdd ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or type a new name..."
              className="pl-9"
              autoFocus
            />
          </div>
          {customers.length > 0 ? (
            <div className="border border-cream-200 rounded-md max-h-48 overflow-y-auto">
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelect(c.id, c.display_name);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-cream-100 text-sm flex items-center justify-between"
                >
                  <span className="text-navy-900">{c.display_name}</span>
                </button>
              ))}
            </div>
          ) : (
            !loading && query.trim().length > 0 && (
              <div className="text-sm text-ink-muted text-center py-3">
                No matches for &quot;{query}&quot;
              </div>
            )
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowAdd(true);
              if (query.trim()) setNewName(query.trim());
            }}
            className="w-full"
          >
            <UserPlus className="h-4 w-4" />
            Quick add a new customer
          </Button>
        </>
      ) : (
        <div className="space-y-3 border border-cream-200 rounded-md p-3 bg-cream-50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-navy-900 uppercase tracking-wide">
              New customer
            </p>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-ink-subtle hover:text-navy-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {addError && (
            <p className="text-xs text-red-700">{addError}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="qa_name" className="text-xs">Name</Label>
            <Input
              id="qa_name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="John Smith"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="qa_platform" className="text-xs">Platform (optional)</Label>
              <Select
                id="qa_platform"
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa_username" className="text-xs">Username (optional)</Label>
              <Input
                id="qa_username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="username"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={handleQuickAdd}
            loading={adding}
            size="sm"
            className="w-full"
          >
            Create and assign
          </Button>
        </div>
      )}
    </div>
  );
}
