import { Metadata } from "next";

const { title, titleLong, description, ogImage, baseURL, socials } = {
  title: "Onyx",
  titleLong: "Onyx | Confidential payment infrastructure for Solana",
  description:
    "Confidential payment infrastructure for onchain teams. Move SOL, USDC, and USDT through a ZK shielded pool — amounts stay off the public ledger, compliance stays audit-ready.",
  baseURL: "https://onyx-red.vercel.app/",
  ogImage: "https://onyx-red.vercel.app/open-graph.png",
  socials: {
    xHandle: "Onyx",
    xUrl: "",
    githubOrg: "divi2806",
  },
};

export const siteConfig: Metadata = {
  title: {
    default: titleLong,
    template: `%s | ${title}`,
  },
  description,
  metadataBase: new URL(baseURL),
  openGraph: {
    title: titleLong,
    description,
    images: [ogImage],
    url: baseURL,
    siteName: title,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: titleLong,
    description,
    images: [ogImage],
    creator: `@${socials.xHandle}`,
    site: `@${socials.xHandle}`,
  },
  icons: {
    icon: "/favicon.ico",
  },
  applicationName: title,
  alternates: {
    canonical: baseURL,
  },
  keywords: [
    "Onyx",
    "useOnyx",
    "Solana",
    "confidential payments",
    "private payroll",
    "ZK payments",
    "shielded payments",
    "USDC payroll",
    "batch payroll",
    "stealth payments",
    "DAO payroll",
    "Solana payments",
    "compliance export",
    "Cloak SDK",
  ],
};
