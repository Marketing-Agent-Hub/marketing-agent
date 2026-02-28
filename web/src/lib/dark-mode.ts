// Utility function to add dark mode classes to existing className strings

export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}

// Common dark mode class patterns
export const darkClasses = {
    // Backgrounds
    bgPage: 'bg-gray-50 dark:bg-gray-900',
    bgCard: 'bg-white dark:bg-gray-800',
    bgHover: 'hover:bg-gray-50 dark:hover:bg-gray-700',
    bgInput: 'bg-white dark:bg-gray-700',
    bgDisabled: 'bg-gray-100 dark:bg-gray-800',

    // Text
    textPrimary: 'text-gray-900 dark:text-white',
    textSecondary: 'text-gray-600 dark:text-gray-300',
    textMuted: 'text-gray-500 dark:text-gray-400',
    textDisabled: 'text-gray-400 dark:text-gray-600',

    // Borders
    border: 'border-gray-200 dark:border-gray-700',
    borderInput: 'border-gray-300 dark:border-gray-600',
    divideColor: 'divide-gray-200 dark:divide-gray-700',

    // Buttons
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600',
    btnSecondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
    btnDanger: 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600',

    // Status colors (keep vibrant in both modes)
    statusRed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    statusYellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    statusGreen: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    statusBlue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    statusPurple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    statusPink: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    statusIndigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
};
