import { MawadhaLogo } from "@/components/logo/MawadhaLogo";

export function Header() {
  return (
    <header className="flex justify-center mb-6 pt-4">
      <div className="text-center">
        <MawadhaLogo className="h-20 mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-primary mt-2">Mawadha</h1>
        <p className="text-sm text-primary/80 italic">Be a better half</p>
      </div>
    </header>
  );
}
