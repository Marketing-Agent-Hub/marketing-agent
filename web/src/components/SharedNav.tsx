import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { useLocation, Link } from 'react-router-dom';

export function SharedNav() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navItems = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Nguồn RSS', href: '/sources' },
        { label: 'Bài viết', href: '/drafts' },
        { label: 'Items', href: '/items' },
        { label: 'Monitoring', href: '/monitoring' },
        { label: '📚 Docs', href: '/docs' },
    ];

    return (
        <div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 shadow">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <Link
                            to="/dashboard"
                            className="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                            News Bot
                        </Link>
                        <nav className="hidden md:flex gap-2">
                            {navItems.map((item) => {
                                const isActive = location.pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        className={
                                            isActive
                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-3 py-2 rounded-md text-sm font-medium'
                                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium'
                                        }
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                    {user && (
                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300">
                                {user.email}
                            </span>
                            <button
                                onClick={logout}
                                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
