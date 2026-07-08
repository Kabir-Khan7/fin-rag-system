"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    if (username.trim() === "" || password.trim() === "") {
      toast.error("Enter a username and password to continue");
      return;
    }
    toast.success("Signed in");
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex">
      {/* Left: brand panel (the ink spine, expanded) */}
      <div className="hidden md:flex md:w-1/2 bg-[var(--color-ink)] text-white flex-col justify-between p-12">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">
            FIN · Bronze Layer
          </p>
          <h1 className="font-display text-4xl mt-4 leading-tight">
            Source<br />Collection
          </h1>
        </div>
        <div className="space-y-4">
          <div className="h-px bg-white/10" />
          <p className="text-white/60 text-sm leading-relaxed max-w-sm">
            The ingestion console for raw financial data — subledgers, bank feeds,
            invoices, and reference tables — before transformation into the warehouse.
          </p>
          <p className="font-mono text-xs text-white/30">v0.1.0</p>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-parchment">
        <div className="w-full max-w-sm space-y-8">
          <div>
            <h2 className="font-display text-2xl text-ink">Sign in</h2>
            <p className="text-slatetext text-sm mt-1">
              Access the Source Collection console.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
              />
            </div>
            <Button
              className="w-full bg-ledger hover:bg-ledger/90 text-white"
              onClick={handleLogin}
            >
              Sign in
            </Button>
          </div>

          <p className="font-mono text-xs text-slatetext text-center">
            Demo access — any username and password will continue.
          </p>
        </div>
      </div>
    </main>
  );
}