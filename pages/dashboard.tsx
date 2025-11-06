import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('auth') !== 'true') {
        router.replace('/login');
      } else {
        setLoading(false);
      }
    }
  }, [router]);

  if (loading) return <div>Loading...</div>;

  return (
    <Layout>
      <h1>Dashboard</h1>
      <p>Welcome to your dashboard!</p>
    </Layout>
  );
}