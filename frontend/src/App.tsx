function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header - compact on mobile, larger on desktop */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4 md:py-6 sm:px-6 lg:px-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            DevContainer
          </h1>
        </div>
      </header>

      {/* Main content - full width on mobile with proper bottom padding for action bar */}
      <main className="flex-1 pb-20 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
          <p className="text-gray-600 text-sm sm:text-base">
            Application is loading...
          </p>
        </div>
      </main>

      {/* Placeholder for sticky ActionBar at bottom */}
      {/* ActionBar will be rendered here when component is integrated */}
    </div>
  );
}

export default App;
