import { Archivo_Black, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  title: "CultureLM — Run the news through the culture",
  description:
    "Upload any document. Pick your show. Get the breakdown the way your group chat would explain it.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
