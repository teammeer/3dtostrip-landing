import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Github, Globe } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "3D to Strip",
  description: "Convert 3D Models to Interactive Sprite Strips",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        <footer className="py-8 border-t border-gray-200">
          <div className="flex justify-between items-center px-8">
            <div className="flex items-center gap-4">
              <a
                href="http://teammeer.com/"
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                title="Website"
                target="_blank"
              >
                <Globe size={14} />
                <span className="text-xs">teammeer</span>
              </a>
              <a
                href="https://github.com/teammeer"
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                title="GitHub"
                target="_blank"
              >
                <Github size={14} />
                <span className="text-xs">github</span>
              </a>
            </div>
            <div className="text-xs text-gray-500">
              © teammer 2025
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
