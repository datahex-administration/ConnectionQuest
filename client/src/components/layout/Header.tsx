export function Header() {
  return (
    <header className="flex justify-center mb-6 pt-4">
      <div className="text-center">
        <div className="mx-auto mb-2 relative">
          <div className="flex flex-col items-center">
            <img 
              src="/images/mawadha-icon.png" 
              alt="Mawadha Logo" 
              className="h-24 w-auto" 
            />
            <img 
              src="/images/mawadha-text.png" 
              alt="Mawadha Text" 
              className="h-12 w-auto mt-1" 
            />
          </div>
        </div>
      </div>
    </header>
  );
}
