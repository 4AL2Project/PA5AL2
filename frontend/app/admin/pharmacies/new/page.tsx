import { redirect } from 'next/navigation';

// L'ajout d'une officine se fait désormais via le drawer sur la liste (/admin).
export default function NewPharmacyRedirect() {
  redirect('/admin');
}
