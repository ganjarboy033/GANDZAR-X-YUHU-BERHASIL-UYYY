import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "XIYU GITHUB UPLOADER",
  description: "A little space for your GitHub projects. Upload, commit, and create with love."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
