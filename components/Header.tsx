interface HeaderProps {
  logout: () => void;
}

export function Header({ logout }: HeaderProps) {
  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <span className="text-sm sm:text-base font-medium">
          Hold My Yield
        </span>
        <button
          onClick={logout}
          className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

