import { unstable_rethrow } from "next/navigation";
import { getRepositories } from "@/lib/repositories";
import { CouponsManager } from "@/components/admin/coupons-manager";
import { EmptyState } from "@/components/empty-state";
import type { StoreCoupon } from "@/lib/types";

export default async function AdminCuponsPage() {
  let coupons: StoreCoupon[];
  try {
    coupons = await getRepositories().coupons.list();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[admin/cupons] tabela indisponível", error);
    return (
      <EmptyState
        title="Não foi possível carregar os cupons."
        description="Se a migration 20261020120000_store_coupons.sql ainda não foi aplicada no Supabase do projeto, aplique-a e recarregue esta página."
      />
    );
  }

  return <CouponsManager initialCoupons={coupons} />;
}
