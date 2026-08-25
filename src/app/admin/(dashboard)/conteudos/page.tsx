import { getRepositories } from "@/lib/repositories";
import { ContentManager } from "@/components/admin/content-manager";

export default async function AdminConteudosPage() {
  const posts = await getRepositories().contentPosts.list();
  return <ContentManager initialPosts={posts} />;
}
