import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { Toaster } from "sonner";

import { LocaleProvider } from "@/components/i18n/locale-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return {
    title: dictionary["metadata.title"],
    description: dictionary["metadata.description"],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <TooltipProvider delayDuration={250}>
            {children}
            <Toaster
              richColors
              position="bottom-center"
              offset={{ bottom: 88 }}
            />
          </TooltipProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
