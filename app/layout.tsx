import "./globals.css";
import { ThemeProvider } from "@/components/ThemeContext";

export const metadata = {
  title: "CV Maker",
  description: "Create ATS-friendly CVs quickly",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}