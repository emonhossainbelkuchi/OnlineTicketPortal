import { Injectable, computed, signal } from '@angular/core';

/**
 * Backs the global top-of-page loading bar (see ShellComponent). Driven by
 * LoadingInterceptor — feature code shouldn't need to touch this directly,
 * every HttpClient call already counts automatically.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly requestCount = signal(0);
  readonly isLoading = computed(() => this.requestCount() > 0);

  start(): void {
    this.requestCount.update((n) => n + 1);
  }

  stop(): void {
    this.requestCount.update((n) => Math.max(0, n - 1));
  }
}
