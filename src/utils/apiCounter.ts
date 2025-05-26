import { CONFIG } from '../config/constants';

interface ApiCounterState {
  count: number;
  lastReset: string; // ISO date string
}

class ApiCallCounter {
  private state: ApiCounterState;

  constructor() {
    this.state = this.loadState();
    this.checkAndResetMonthly();
  }

  private loadState(): ApiCounterState {
    const defaultState: ApiCounterState = {
      count: 0,
      lastReset: new Date().toISOString()
    };

    try {
      const stored = localStorage.getItem(CONFIG.API.STORAGE_KEY);
      if (!stored) return defaultState;

      const parsed = JSON.parse(stored) as ApiCounterState;
      return {
        count: Number(parsed.count) || 0,
        lastReset: parsed.lastReset || new Date().toISOString()
      };
    } catch {
      return defaultState;
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem(CONFIG.API.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save API counter state:', error);
    }
  }

  private checkAndResetMonthly(): void {
    const lastReset = new Date(this.state.lastReset);
    const now = new Date();

    // Reset if we're in a new month
    if (lastReset.getMonth() !== now.getMonth() || 
        lastReset.getFullYear() !== now.getFullYear()) {
      this.state = {
        count: 0,
        lastReset: now.toISOString()
      };
      this.saveState();
    }
  }

  public increment(): void {
    this.checkAndResetMonthly();
    this.state.count++;
    this.saveState();
  }

  public getCount(): number {
    this.checkAndResetMonthly();
    return this.state.count;
  }

  public getPercentage(): number {
    return (this.getCount() / CONFIG.API.MONTHLY_LIMIT) * 100;
  }
}

// Export a singleton instance
export const apiCounter = new ApiCallCounter(); 