"use client";
import { usePathname } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();
  const account = useCurrentAccount();

  // Hide on landing page
  if (pathname === "/") return null;

  // Hide on /app gate screen (no wallet connected)
  if (pathname === "/app" && !account) return null;

  return <Navbar />;
}
