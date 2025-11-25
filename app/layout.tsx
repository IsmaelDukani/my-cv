import { ClerkProvider } from '@clerk/nextjs';
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
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}