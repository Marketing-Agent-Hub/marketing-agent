import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
    label: string;
    href: string;
    active?: boolean;
}

interface SharedNavProps {
    title: string;
    items: NavItem[];
}

export function SharedNav({ title, items }: SharedNavProps) {
    const { user, logout } = useAuth();

    return (
        <div className="bg-white dark:bg-gray-800 shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h1>
                        <nav className="flex gap-4">
                            {items.map((item) => (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    className={
                                        item.active
                                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-3 py-2 rounded-md text-sm font-medium'
                                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium'
                                    }
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            {user?.email}
                        </span>
                        <button
                            onClick={logout}
                            className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
