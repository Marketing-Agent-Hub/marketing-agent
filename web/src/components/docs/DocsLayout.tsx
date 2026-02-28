// Main documentation layout
import { Outlet } from 'react-router-dom';
import { SharedNav } from '../SharedNav';
import { DocsSidebar } from './DocsSidebar';
import { useState } from 'react';
import { cn } from '../../lib/utils';

export function DocsLayout() {
    console.log('[DocsLayout] Component rendered');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
            <SharedNav />

            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
                <div className="flex gap-8">
                    {/* Mobile sidebar toggle */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700"
                        aria-label="Toggle sidebar"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {sidebarOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>

                    {/* Sidebar - desktop */}
                    <aside className="hidden lg:block w-64 flex-shrink-0">
                        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto py-8">
                            <DocsSidebar />
                        </div>
                    </aside>

                    {/* Sidebar - mobile drawer */}
                    {sidebarOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="lg:hidden fixed inset-0 bg-black/50 z-40"
                                onClick={() => setSidebarOpen(false)}
                            />

                            {/* Drawer */}
                            <aside
                                className={cn(
                                    'lg:hidden fixed top-0 left-0 bottom-0 w-64 z-50',
                                    'bg-white dark:bg-gray-900 shadow-xl',
                                    'transform transition-transform duration-200',
                                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                                )}
                            >
                                <div className="h-full overflow-y-auto p-6 pt-24">
                                    <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
                                </div>
                            </aside>
                        </>
                    )}

                    {/* Main content */}
                    <main className="flex-1 py-8 min-w-0">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}
