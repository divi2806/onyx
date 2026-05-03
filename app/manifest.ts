import type { MetadataRoute } from "next";

const { appName, description } = {
  appName: "Onyx",
  description:
    "Confidential payment infrastructure for onchain teams. Move SOL, USDC, and USDT through a ZK shielded pool — amounts stay off the public ledger, compliance stays audit-ready.",
};

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: appName,
    description: description,
    start_url: "/",
    display: "standalone",
    background_color: "#09090f",
    theme_color: "#7c5cfc",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/onyx/mainlogo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
