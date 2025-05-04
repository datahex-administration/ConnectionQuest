import { Link } from "wouter";

interface FooterProps {
  showAdminLink?: boolean;
}

export function Footer({ showAdminLink = true }: FooterProps) {
  return (
    <footer className="mt-12 text-center text-gray-500 text-sm">
      <div className="flex justify-center items-center space-x-2 mb-2">
        {showAdminLink && (
          <>
            <Link href="/admin/login" className="text-primary hover:text-primary/80">
              Admin
            </Link>
            <span>|</span>
          </>
        )}
        <a href="#" className="text-primary hover:text-primary/80">
          Privacy Policy
        </a>
        <span>|</span>
        <a href="#" className="text-primary hover:text-primary/80">
          Terms of Service
        </a>
      </div>
      <p>© {new Date().getFullYear()} Mawadha. All rights reserved.</p>
    </footer>
  );
}
