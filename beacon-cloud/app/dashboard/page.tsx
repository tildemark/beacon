import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    // Redirect based on role
    if (session.user.role === 'HR' || session.user.role === 'IT') {
        redirect('/hr/dashboard');
    } else {
        redirect('/employee/dashboard');
    }
}
