import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { combineLatest, filter, map, take } from 'rxjs';
import { SupabaseClientService } from '../services/supabase-client.service';

export const GuestGuard: CanActivateFn = () => {
  const supabase = inject(SupabaseClientService);
  const router = inject(Router);

  return combineLatest([supabase.session$, supabase.sessionReady$]).pipe(
    filter(([, ready]) => ready),
    take(1),
    map(([session]) => (session ? router.createUrlTree(['/settings']) : true))
  );
};
