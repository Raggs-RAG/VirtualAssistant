import { Anton, Manrope } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  title: "CultureLM — Run the news through the culture",
  description:
    "Upload any document. Pick your show. Get the breakdown the way your group chat would explain it.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${anton.variable} ${manrope.variable}`}>{children}</body>
    </html>
  );
}
