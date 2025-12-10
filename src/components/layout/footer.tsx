import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-fd-muted-foreground">
            <Link
              href="https://whitepages.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground transition-colors"
            >
              Whitepages
            </Link>
            <Link
              href="https://github.com/whitepages"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="https://whitepages.com/pro-api"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground transition-colors"
            >
              API Access
            </Link>
            <Link
              href="https://whitepages.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="https://whitepages.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground transition-colors"
            >
              Terms
            </Link>
          </div>
          <p className="text-sm text-fd-muted-foreground">
            Built with ❤️ in Seattle.
          </p>
        </div>
      </div>
    </footer>
  );
}
