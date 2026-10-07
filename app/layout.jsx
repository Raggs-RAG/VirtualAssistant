import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Sora({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
});
const body = JetBrains_Mono({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "CultureLM — Run the news through the culture",
  description:
    "Upload any document. Pick your show. Get the breakdown the way your group chat would explain it.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
