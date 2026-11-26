"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "./track";

/** Compte une page vue à chaque changement de page. */
function Tracker() {
  const pathname = usePathname();
  useEffect(() => {
    track("view", pathname);
  }, [pathname]);
  return null;
}

export { Tracker as PageViews };
