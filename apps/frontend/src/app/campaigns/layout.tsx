import Layout from '../../components/Layout';

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Allow campaigns to be viewed by all users (no role restrictions)
  return <Layout requiredRoles={[]}>{children}</Layout>;
}
